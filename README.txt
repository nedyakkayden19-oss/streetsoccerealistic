STREET SOCCER 3D  (with online multiplayer server)
===================================================

PLAY ONLINE (needs Node.js 16+ from nodejs.org)
  1. Open a terminal in this folder.
  2. npm install        (one time)
  3. npm start
  4. Open http://localhost:3000  -> Create lobby. Share the 4-letter code.
     Friends on your network open http://<your-computer-ip>:3000 and use Join lobby.

PLAY WITH FRIENDS OVER THE INTERNET
  Upload this whole folder to any Node host (Render, Railway, Fly.io, Replit, Glitch, a VPS...).
  Build command: npm install     Start command: npm start
  Everyone opens the https:// address the host gives you. Same link = same server = lobbies work.
  (The game uses the page's own address as the multiplayer server automatically.)

  If the page is hosted somewhere else (e.g. static hosting) and the server elsewhere, add this
  line inside <head> of index.html, before the game loads:
     <script>window.STREET_SOCCER_SERVER_URL="https://your-server.example.com"</script>

NOTE: just double-clicking index.html still lets you play every offline mode, but online lobbies
need the server above (browsers can't make rooms without one).

REFRESH-PROOF LOADING
  The 3D engine (three.js) downloads from several CDNs at once, retries, and is cached in the
  browser, so refreshing keeps working. Optional: put three.min.js (r128) next to index.html
  and it is used first (no internet needed for the engine).
  If anything fails the screen offers "Reload game" / "Clear cache & reload".
