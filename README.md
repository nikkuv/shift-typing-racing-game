# SHIFT — Multiplayer typing races

A playable React + Three.js typing racer with realistic Ferrari models, neon arena styling, AI practice, and live private rooms for up to three friends.

## Showroom garage

Open **Garage** to view your car on a rotating illuminated platform. Drag to orbit, scroll to zoom, pause/resume the turntable, choose front/side/rear views, switch neon or studio lighting, and preview six paint finishes. Paint carries over to the race car. Automatic rotation respects reduced-motion preferences, with a manual resume control.

## Invite friends

1. Open the game and choose **Race friends**.
2. Enter your driver name and click **Create a room**.
3. Click **Copy invite**, then send the link to your friends.
4. Friends enter their names and click **Join**.
5. Everyone clicks **I'm ready**. The host clicks **Start race**.

All drivers receive the same passage and server-timed countdown. Progress, WPM, accuracy, and standings update live. Race again opens a fresh ready lobby. Driver seats recover after a refresh; host controls transfer to an online driver when the host disconnects.

## Run locally

Requires Node.js 22.12+ or 20.19+.

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:5175. `npm run dev` serves the same Node/WebSocket backend with Vite middleware for development. `PORT` and `HOST` configure the listener; the default host is loopback.

**Localhost links only work on the host computer.** For internet access, deploy the Node server or use a temporary HTTPS tunnel. Set `PUBLIC_URL` to the public HTTPS origin to make the local UI copy externally usable invite links. When opened on a public URL directly, the game uses that origin automatically.

## Hosting

The included Dockerfile builds the frontend and runs the Node server on port 3000. Use any host that supports long-running Node servers and WebSocket upgrades at `/ws`. Terminate HTTPS at the hosting proxy. Static-only hosting is not sufficient for the multiplayer backend.

```sh
docker build -t shift-racing .
docker run --rm -p 3000:3000 -e PUBLIC_URL=https://your-domain.example shift-racing
```

Run one server instance. Rooms are held in memory; server restarts end active rooms. Multi-instance deployments require a shared room coordinator and are not implemented. The temporary test link created during this task remains available only while the host computer, game server, and tunnel keep running. It is not permanent hosting.

## Multiplayer behavior

- Three human slots, secret randomly generated invite codes, no account required.
- Per-driver reconnect tokens stay in sessionStorage and are not broadcast to other players.
- Shared four-second countdown, server-selected passage, and a two-minute race limit.
- Server checks host authority, readiness, input sequence, race ID, passage correctness, timing, and finish order.
- Typing updates are batched while preserving mistake and correction history.
- Cross-origin WebSocket handshakes are rejected; requests and message sizes are bounded.
- Ready-state disconnects reserve a seat for up to 60 seconds. During races, drivers may reconnect until the race ends; abandoned rooms expire after the reconnect window. Inactive rooms expire after 30 minutes.
- A first finisher can watch the remaining drivers. Unfinished drivers at the deadline receive DNF.
- Casual private racing, not a ranked anti-cheat system. Clients can automate typing; no claim of cheating prevention is made.

## Tests

```sh
npm test
SHIFT_TEST_URL=http://127.0.0.1:5175 npm test
```

The first command runs 12 deterministic room tests and skips network checks. The second also runs 2 real network tests against a running server. These cover three clients, countdown synchronization, permissions, input ordering and correction, results, rematches, reconnects, room limits, expiration, cross-origin rejection, and static-file boundaries.

Browser checks completed against local and public origins: invite flow, readiness, shared passage, live progress, reconnect after refresh, burst typing, final results, and copy-invite feedback.

## Source

- `src/main.jsx`: original solo racing and application navigation
- `src/Multiplayer.jsx`: room UI and reconnecting WebSocket client
- `src/RaceScene.jsx`: 3D track, cars, and multiplayer positions/colors
- `server/rooms.mjs`: authoritative room and race logic
- `server/index.mjs`: production static server and WebSocket transport
- `tests/`: room logic and real network tests

3D Ferrari asset: Three.js example collection, credited to vicent091. Three.js also supplies the Draco decoders. Icons: Lucide. Fonts: Google Fonts. LocalStorage stores driver name, paint, and completed personal results. Only room names, car colors, typing states, and race metrics are sent to the game server; existing personal race history is not uploaded.

### Smooth typing surface
Solo and multiplayer races share a memoized typing surface with immediate local character feedback, a smoothly moving caret, whole-word wrapping, and a three-line scrolling viewport. Font loading and resizing recalculate caret positions; reduced-motion preferences disable caret/scroll animations. Native textarea input supports keyboard corrections and selection. Paste/drop remain disabled for race fairness. Leaving the input shows a click-to-focus prompt; the race clock keeps running.
