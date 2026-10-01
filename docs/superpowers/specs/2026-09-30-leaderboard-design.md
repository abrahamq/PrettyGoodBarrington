# Leaderboard design (2026-09-30)

Approved by Abe on 2026-09-30. This changes the plan's "No server" rule: the game must still work fully without the server, and the leaderboard is an optional extra.

## Decisions

| Question | Choice |
|---|---|
| What is ranked | One overall board: most stamps, then most tips, then whoever got there first. |
| Who is on it | Players pick a display name. No login: a secret device token, kept in localStorage, proves which row is theirs. |
| Where it runs | Locally first (Abe's Mac; phones reach it over Wi-Fi). Hosting is chosen later. SQLite. |
| Where the code lives | `server/` in this repo. |
| When scores go up | Only when the player presses SUBMIT on the leaderboard screen. |

## Server (`server/`)

- Rails 8.1, API-only (`--api --minimal`), SQLite, Minitest. Ruby 3.3.3 pinned in `server/.ruby-version`. One added gem: `rack-cors`.
- `players` table: `name` (unique), `token_digest` (unique; SHA-256 of the token, never the token itself), `stamps` (0-8), `tips_cents` (0-100,000), `submitted_at`, timestamps.
- Name rules: uppercase letters, digits, and single spaces; 3-10 characters after trimming; unique; rejected if it contains a word on a short blocklist.
- Scores only go up: a submit with fewer stamps or tips than stored keeps the stored values. `submitted_at` changes only when the standing improves.
- Endpoints (JSON, camelCase keys):
  - `GET /leaderboard`: the top 10 as `{ rank, name, stamps, tipsCents }`. With a valid `Authorization: Bearer <token>`, it also returns `you` (the caller's own row and rank).
  - `POST /players` with `{ name, stamps, tipsCents }`: 201 with `{ token, you }`. The token is returned only here. 422 with `{ error }` for a bad or taken name.
  - `PATCH /players/me` with the token and `{ stamps, tipsCents }`: 200 with `{ you }`. 401 without a valid token.
- Rate limit on the two write endpoints: 10 requests per minute per IP, in an in-process memory store (429 when exceeded).
- CORS: in development, the game's dev origins on port 8080 (localhost, 127.0.0.1, private 192.168/10/172.16-31 networks). In production, the origins in `ALLOWED_ORIGINS` (comma-separated).

## Game

- Title menu gains LEADERBOARD, opening a new Leaderboard scene: top 10 (rank, name, stamp icon and count, tips), the player's own rank, a status line, and [SUBMIT] and [BACK].
- SUBMIT sends the current save's stamp count and tips. The first time, a NameEntry scene asks for a name with an arcade-style letter grid (A-Z, 0-9; SPACE, DEL, OK buttons; typing on a keyboard works too), then creates the player.
- The name and token live in localStorage under `msq-leaderboard`, apart from the save, so RESET SAVE keeps them.
- The API address is `VITE_LEADERBOARD_URL` when set, otherwise the page's own host on port 3000.
- Requests time out after 5 seconds. When the server cannot be reached, the screen says CAN'T REACH THE BOARD; nothing else in the game changes.

## Known limit

The game reports its own scores, so a determined person could post fake numbers with `curl`. The value caps, the rate limit, and deleting rows from the Rails console are the defense. This is acceptable for a small hometown game and is not cheat-proof.

## Testing

- Rails: model tests (name rules, ranking, rank, scores only go up, token lookup) and request tests (each endpoint, auth, validation errors, rate limit, CORS preflight).
- Game: Vitest for name rules, the API address, the API client (with a fake `fetch`), and the stored identity.
- Browser: the Leaderboard and NameEntry scenes against the local Rails server, in headless Chrome.
