/* BEYOND BERZERK — isolated Cloudflare D1 World Top 10.
 * Normal browser-reported runs only. Scores are anonymous and cannot be
 * cryptographically attested from public GitHub Pages JavaScript.
 */
const LIMIT=10, RULESET="survival-v1", MAX_SCORE=1000000000;
const ORIGINS=new Set([
  "https://richcande1-rca.github.io",
  "http://localhost:8000","http://127.0.0.1:8000",
  "http://localhost:8787","http://127.0.0.1:8787"
]);
function headers(request) {
  const origin=request.headers.get("Origin")||"";
  return {
    ...(ORIGINS.has(origin)?{"Access-Control-Allow-Origin":origin}:{}),
    "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type",
    "Access-Control-Max-Age":"86400","Vary":"Origin",
    "Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"
  };
}
function respond(req,data,status=200) {
  return new Response(JSON.stringify(data),{status,headers:headers(req)});
}
function clean(payload) {
  if (!payload || typeof payload!=="object" || Array.isArray(payload))
    return {error:"Invalid score payload."};
  const initials=typeof payload.initials==="string"?payload.initials.trim().toUpperCase():"";
  if (!/^[A-Z0-9]{1,5}$/.test(initials))
    return {error:"Initials must be 1–5 letters or numbers."};
  if (payload.ruleset!==RULESET || payload.mode!=="normal")
    return {error:"Only normal survival runs may be submitted."};
  for(const [name,min,max] of [["score",1,MAX_SCORE],
     ["wave",1,99999],["robots",0,10000000]]) {
    if (!Number.isSafeInteger(payload[name]) ||
        payload[name]<min || payload[name]>max)
      return {error:"Invalid "+name+"."};
  }
  if(typeof payload.leviathan!=="boolean")return {error:"Invalid Leviathan flag."};
  if(typeof payload.build!=="string" || !/^0\.\d+\.\d+$/.test(payload.build) ||
      payload.build.length>20)return {error:"Invalid build."};
  return {initials,score:payload.score,wave:payload.wave,robots:payload.robots,
    leviathan:payload.leviathan?1:0,build:payload.build};
}
async function readEntries(env) {
  const result=await env.DB.prepare(
    "SELECT initials, score, wave, robots, leviathan, created_at AS createdAt "+
    "FROM beyond_berzerk_entries "+
    "ORDER BY score DESC, wave DESC, robots DESC, created_at ASC, id ASC LIMIT ?"
  ).bind(LIMIT).all();
  return (result.results||[]).map(row=>({...row,leviathan:!!row.leviathan}));
}
function outranks(candidate,last) {
  return candidate.score>last.score ||
    (candidate.score===last.score && candidate.wave>last.wave) ||
    (candidate.score===last.score && candidate.wave===last.wave &&
      candidate.robots>last.robots);
}
async function getBoard(req,env) {
  return respond(req,{ok:true,game:"beyond-berzerk",ruleset:RULESET,
    limit:LIMIT,entries:await readEntries(env)});
}
async function postBoard(req,env) {
  let body;
  try {
    const text=await req.text();
    if (text.length>1024)return respond(req,{ok:false,error:"Request too large."},413);
    body=JSON.parse(text);
  } catch {return respond(req,{ok:false,error:"Invalid JSON."},400)}
  const data=clean(body);
  if (data.error)return respond(req,{ok:false,error:data.error},400);
  const board=await readEntries(env);
  if(board.length>=LIMIT && !outranks(data,board[board.length-1]))
    return respond(req,{ok:false,error:"This score no longer qualifies for the world Top 10."},409);
  const dupe=await env.DB.prepare(
    "SELECT id FROM beyond_berzerk_entries WHERE initials=? AND score=? "+
    "AND wave=? AND robots=? AND created_at>=datetime('now','-5 minutes') LIMIT 1"
  ).bind(data.initials,data.score,data.wave,data.robots).first();
  if (!dupe) {
    await env.DB.prepare(
      "INSERT INTO beyond_berzerk_entries (initials,score,wave,robots,leviathan,build,ruleset) "+
      "VALUES (?,?,?,?,?,?,?)"
    ).bind(data.initials,data.score,data.wave,data.robots,
      data.leviathan,data.build,RULESET).run();
    await env.DB.prepare(
      "DELETE FROM beyond_berzerk_entries WHERE id IN "+
      "(SELECT id FROM beyond_berzerk_entries "+
      "ORDER BY score DESC, wave DESC, robots DESC, created_at ASC,id ASC LIMIT -1 OFFSET ?)"
    ).bind(LIMIT).run();
  }
  return getBoard(req,env);
}
export default {async fetch(req,env) {
  const pathname=new URL(req.url).pathname;
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(req)});
  if(pathname==="/" && req.method==="GET")
    return respond(req,{ok:true,service:"Beyond Berzerk World Board",endpoint:"/api/board"});
  if(pathname!=="/api/board")return respond(req,{ok:false,error:"Not found."},404);
  if(!env.DB)return respond(req,{ok:false,error:"Cloudflare D1 binding DB not configured."},503);
  try {
    if(req.method==="GET")return await getBoard(req,env);
    if(req.method==="POST")return await postBoard(req,env);
    return respond(req,{ok:false,error:"Method not allowed."},405);
  } catch (error) {
    return respond(req,{ok:false,error:"Cloudflare leaderboard database unavailable."},503);
  }
}};