// Street Soccer 3D multiplayer server (Socket.IO room relay).
// The HOST's browser runs the match; this server only creates rooms and relays messages between players.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 20;
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O (matches the game's room-code check)
const STATIC = { '/': 'index.html', '/index.html': 'index.html', '/three.min.js': 'three.min.js' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8' };

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  const file = STATIC[url];
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const io = new Server(server, { cors: { origin: '*' }, transports: ['websocket', 'polling'], pingInterval: 10000, pingTimeout: 15000, maxHttpBufferSize: 1e6 });
attach(io);

function attach(io) {
  const lobbies = new Map(); // code -> { code, hostId, players: [{id,name}] }
  const cleanName = n => String(n || 'Player').replace(/[^\w .\-]/g, '').trim().slice(0, 16) || 'Player';
  const view = l => ({ code: l.code, hostId: l.hostId, players: l.players.map(p => ({ id: p.id, name: p.name })) });
  const newCode = () => { for (let t = 0; t < 200; t++) { let c = ''; for (let i = 0; i < 4; i++) c += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]; if (!lobbies.has(c)) return c; } return null; };

  function leave(socket, why) {
    const code = socket.data && socket.data.code; if (!code) return;
    socket.data.code = null; socket.leave(code);
    const l = lobbies.get(code); if (!l) return;
    if (l.hostId === socket.id) { // host left -> close the room for everyone
      lobbies.delete(code);
      io.to(code).emit('lobby-closed', { reason: why || 'The lobby host left. The room has closed.' });
      io.in(code).socketsLeave(code);
    } else {
      l.players = l.players.filter(p => p.id !== socket.id);
      io.to(code).emit('lobby-updated', view(l));
    }
  }

  io.on('connection', socket => {
    socket.data = { code: null };
    socket.on('create-lobby', (d, ack) => {
      if (typeof ack !== 'function') return;
      leave(socket);
      const code = newCode(); if (!code) return ack({ ok: false, error: 'Server is full, try again.' });
      const l = { code, hostId: socket.id, players: [{ id: socket.id, name: cleanName(d && d.name) }] };
      lobbies.set(code, l); socket.data.code = code; socket.join(code);
      ack({ ok: true, lobby: view(l) });
    });
    socket.on('join-lobby', (d, ack) => {
      if (typeof ack !== 'function') return;
      const code = String((d && d.code) || '').toUpperCase().replace(/[^A-Z]/g, '');
      const l = lobbies.get(code);
      if (!l) return ack({ ok: false, error: 'Room not found. Check the four-letter code.' });
      if (l.players.length >= MAX_PLAYERS) return ack({ ok: false, error: 'That room is full.' });
      leave(socket);
      l.players.push({ id: socket.id, name: cleanName(d && d.name) });
      socket.data.code = code; socket.join(code);
      ack({ ok: true, lobby: view(l) });
      io.to(code).emit('lobby-updated', view(l));
    });
    socket.on('leave-lobby', ack => { leave(socket); if (typeof ack === 'function') ack(); });
    socket.on('game-event', packet => {
      const code = socket.data.code; if (!code || !packet || typeof packet.event !== 'string') return;
      const out = { event: packet.event, data: packet.data, peer: socket.id };
      // snapshots and inputs are time-sensitive: drop them instead of queueing if a client is behind
      if (packet.event === 'st' || packet.event === 'in' || packet.event === 'pen-st' || packet.event === 'pen-in') socket.volatile.to(code).emit('game-event', out);
      else socket.to(code).emit('game-event', out);
    });
    socket.on('disconnect', () => leave(socket, 'The lobby host disconnected. The room has closed.'));
  });
  return lobbies;
}

module.exports = { attach };
if (require.main === module) server.listen(PORT, () => console.log('Street Soccer 3D running on http://localhost:' + PORT));
