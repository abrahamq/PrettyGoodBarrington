# Main Street Quest leaderboard

A small Ruby on Rails API (Rails 8.1, SQLite) that keeps the game's leaderboard. Players pick a name; there is no login. The first submit returns a secret token, and the game keeps it in `localStorage` to update the same row later. Ranking: most stamps first, then most tips, then whoever got there first.

## Run it

You need Ruby 3.3.3 (`.ruby-version`).

1. `bundle install`
2. `bin/rails db:prepare`
3. `bin/rails server -b 0.0.0.0 -p 3030` (or `npm run server` from the repo root)

Port 3030 is where the game looks by default. `-b 0.0.0.0` lets a phone on the same Wi-Fi reach it.

## Test it

`bin/rails test` (or `npm run server:test` from the repo root).

## API

All bodies are JSON. Entries look like `{ "rank": 1, "name": "ABE", "stamps": 3, "tipsCents": 1250 }`.

| Request | Answer |
|---|---|
| `GET /leaderboard` | `{ "players": [top 10 entries], "you": entry or null }`. Send `Authorization: Bearer <token>` to get `you`. |
| `POST /players` with `{ "name", "stamps", "tipsCents" }` | 201 `{ "token", "you" }`. The token is shown only this once. 422 `{ "error" }` for a bad name or score. |
| `PATCH /players/me` with `{ "stamps", "tipsCents" }` and the Bearer token | 200 `{ "you" }`. Scores only go up. 401 without a known token. |
| `GET /up` | 200 when the app is running. |

Error codes: `name_taken`, `name_not_allowed`, `name_invalid`, `bad_score`, `unknown_player`.

Rules: names are 3-10 letters, digits, and single spaces, stored in capitals, unique, and checked against a short list of rude words. Stamps are 0-8; tips are 0-100,000 cents. `POST` and `PATCH` allow 10 requests per minute from each IP address.

## Remove a player

The game reports its own scores, so someone could post fake numbers. To remove a row:

```sh
bin/rails runner 'Player.find_by(name: "SOME NAME")&.destroy'
```

## Host it

- Set `ALLOWED_ORIGINS` to the game's origin (comma-separated for more than one), for example `https://example.github.io`. In development, the Vite dev server on port 8080 is always allowed.
- SQLite keeps its data in `storage/`, so the host needs a disk that survives restarts.
- Build the game with `VITE_LEADERBOARD_URL` set to this server's URL.
