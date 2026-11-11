# Beyond Berzerk — Cloudflare D1 worldwide leaderboard

This repository contains the complete **game client** and a separate **Cloudflare Worker + D1 backend**. GitHub Pages publishing does **not** deploy the Cloudflare Worker or initialize D1. No other game's worker or database should be edited.

## Dashboard setup (same workflow as Luck Machine)

1. Cloudflare dashboard → **Workers & Pages**: create a Worker named **beyond-berzerk-board**. Use this name so the game can reach the expected endpoint under your account's existing **rich-gothic.workers.dev** workers.dev subdomain.
2. Cloudflare dashboard → **D1 SQL Database**: create **beyond_berzerk_board**. Run the complete [schema.sql](schema.sql) in that database's **Console**. **Do not use the Orbit or Luck Machine databases.**
3. In the new Worker's **Settings → Bindings**, add a D1 binding named **DB** to **beyond_berzerk_board**.
4. In the Worker **Edit Code** view, replace its code with the complete [src/index.js](src/index.js), then **Deploy**.
5. In a browser, open **https://beyond-berzerk-board.rich-gothic.workers.dev/api/board**. It should return JSON with **ok:true**, **game:"beyond-berzerk"**, **ruleset:"survival-v1"**, and **entries:[]**.
6. Refresh the GitHub Pages game. The **WORLD TOP 10** button should now show **SHARED CLOUDFLARE D1 LEADERBOARD** instead of the offline warning. Finish a normal run to submit a qualifying score.

### Optional Wrangler route

From the **worker/** folder:

- Create a dedicated D1 database: \`npx wrangler d1 create beyond_berzerk_board\`
- Copy the returned database ID into \`wrangler.toml\` (never commit Cloudflare tokens).
- Initialize the remote D1: \`npx wrangler d1 execute beyond_berzerk_board --remote --file=./schema.sql\`
- Deploy the Worker: \`npx wrangler deploy\`

## API contract

- GET \`/api/board\`: Top 10 ordered by descending **score**, then highest **wave**, then **robots destroyed**.
- POST \`/api/board\`: JSON \`{"initials":"RICH","score":42000,"wave":12,"robots":320,"leviathan":false,"build":"0.3.34","ruleset":"survival-v1","mode":"normal"}\`.
- Only records that currently qualify for Top 10 are inserted; old low-ranked records are deleted. Duplicate score submissions within five minutes are ignored.
- **Test mode never emits the normal-game completion event**, so test runs cannot submit via the supplied frontend. A public static browser game cannot cryptographically prove that a run was not modified; scores are community-honor-based.
- The **existing local personal best remains unchanged**. Initials are saved locally only for convenience. No separate offline scoreboard and no fake success confirmation during network errors.
- Allowed browser origin: \`https://richcande1-rca.github.io\` plus local development.
- 10 rows maximum, no logins, no player tracking, no interaction with other Cloudflare databases.
