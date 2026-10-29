
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import { Chess } from 'chess.js';
import pool from './db.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Add it to backend/.env');
  process.exit(1);
}

const app = express();
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean)
  : null;

app.use(cors({ origin: allowedOrigins || true }));
app.use(express.json({ limit: '10kb' }));

/* ---------------------------- HTTP: auth + info ---------------------------- */

const signToken = (player) =>
  jwt.sign({ playerId: player.id, username: player.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

app.get('/', (req, res) => res.json({ ok: true, service: 'ChessZone' }));

app.post('/api/register', async (req, res) => {
  try {
    const { username, displayName, password } = req.body || {};

    if (typeof username !== 'string' || typeof displayName !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const cleanUsername = username.trim();
    const cleanDisplayName = displayName.trim();

    if (
      cleanUsername.length < 3 || cleanUsername.length > 50 ||
      cleanDisplayName.length < 1 || cleanDisplayName.length > 50 ||
      password.length < 8 || Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        error: 'Username must be 3–50 characters, display name 1–50 characters, and password 8–72 bytes.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO players (username, display_name, password_hash) VALUES (?, ?, ?)',
      [cleanUsername, cleanDisplayName, passwordHash]
    );

    const player = { id: result.insertId, username: cleanUsername };
    res.status(201).json({
      token: signToken(player),
      user: { id: player.id, username: cleanUsername, displayName: cleanDisplayName }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username already exists.' });
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const [rows] = await pool.execute(
      'SELECT id, username, display_name, password_hash FROM players WHERE username = ?',
      [username.trim()]
    );
    const player = rows[0];

    if (!player || !player.password_hash || !(await bcrypt.compare(password, player.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    res.json({
      token: signToken(player),
      user: { id: player.id, username: player.username, displayName: player.display_name || player.username }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// Get the logged-in user's profile and statistics
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        p.id,
        p.username,
        p.display_name,
        p.created_at,
        COUNT(mh.room_id) AS gamesPlayed,
        COALESCE(SUM(mh.result = 'win'), 0) AS wins,
        COALESCE(SUM(mh.result = 'loss'), 0) AS losses,
        COALESCE(SUM(mh.result = 'draw'), 0) AS draws
       FROM players p
       LEFT JOIN match_history mh
         ON mh.player_id = p.id
         AND mh.result IN ('win', 'loss', 'draw')
       WHERE p.id = ?
       GROUP BY p.id, p.username, p.display_name, p.created_at`,
      [req.player.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const p = rows[0];
    const gamesPlayed = Number(p.gamesPlayed);
    const wins = Number(p.wins);
    const losses = Number(p.losses);
    const draws = Number(p.draws);

    res.json({
      profile: {
        id: p.id,
        username: p.username,
        displayName: p.display_name,
        createdAt: p.created_at,
        gamesPlayed,
        wins,
        losses,
        draws,
        winRate: gamesPlayed
          ? Number(((wins / gamesPlayed) * 100).toFixed(1))
          : 0
      }
    });
  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(500).json({
      error: 'Could not load profile'
    });
  }
});

app.get('/api/history', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        mh.room_id AS roomId,
        mh.color,
        mh.result,
        mh.played_at AS playedAt,
        p2.username AS opponent,
        gr.reason
       FROM match_history mh
       LEFT JOIN players p2
         ON p2.id = mh.opponent_player_id
       LEFT JOIN game_results gr
         ON gr.room_id = mh.room_id
       WHERE mh.player_id = ?
       ORDER BY mh.played_at DESC
       LIMIT 100`,
      [req.player.id]
    );

    res.json({ history: rows });
  } catch (error) {
    console.error('History error:', error.message);
    res.status(500).json({
      error: 'Could not load match history'
    });
  }
});
/* ------------------------------ WebSocket game ----------------------------- */

const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 10 * 1024 });

// room code -> { id, code, sockets, game, whiteId, blackId, chooserId, status, moveCount, pendingDraw }
const rooms = new Map();
const roomQueues = new Map();

const send = (ws, data) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); };
const everyone = (room, data) => { for (const ws of room.sockets) send(ws, data); };
const opposite = (color) => (color === 'white' ? 'black' : 'white');
const isMember = (room, ws) => Boolean(room && room.sockets.has(ws));
const playerColor = (room, id) => (room.whiteId === id ? 'white' : room.blackId === id ? 'black' : null);

const publicState = (room) => ({
  type: 'game-state',
  fen: room.game.fen(),
  status: room.status
});

// Runs room actions one at a time (including DB writes) so moves and joins never interleave.
function enqueue(code, action) {
  const prior = roomQueues.get(code) || Promise.resolve();
  const current = prior.catch(() => {}).then(action);
  roomQueues.set(code, current);
  current
    .finally(() => { if (roomQueues.get(code) === current) roomQueues.delete(code); })
    .catch(() => {});
  return current;
}

async function loadRoom(code) {
  if (rooms.has(code)) return rooms.get(code);

  const [rows] = await pool.execute('SELECT * FROM game_rooms WHERE room_code = ?', [code]);
  let row = rows[0];

  if (!row) {
    const [r] = await pool.execute("INSERT INTO game_rooms (room_code, status) VALUES (?, 'waiting')", [code]);
    const [created] = await pool.execute('SELECT * FROM game_rooms WHERE id = ?', [r.insertId]);
    row = created[0];
  }

  if (row.status === 'completed' || row.status === 'abandoned') {
    throw Error('This game has ended. Create a new room.');
  }

  const game = new Chess();
  const [moves] = await pool.execute(
    'SELECT from_square, to_square, promotion FROM game_moves WHERE room_id = ? ORDER BY move_number',
    [row.id]
  );
  for (const m of moves) {
    game.move({ from: m.from_square, to: m.to_square, ...(m.promotion ? { promotion: m.promotion } : {}) });
  }

  const room = {
    id: row.id,
    code,
    sockets: new Set(),
    game,
    whiteId: row.white_player_id,
    blackId: row.black_player_id,
    chooserId: row.white_player_id || row.black_player_id || null,
    status: row.status,
    moveCount: moves.length,
    pendingDraw: null
  };
  rooms.set(code, room);
  return room;
}

function notify(room) {
  for (const ws of room.sockets) {
    const others = [...room.sockets].filter(s => s !== ws);
    send(ws, { type: 'opponent', opponent: others.map(s => s.name) });
    send(ws, {
      type: 'side-assigned',
      color: playerColor(room, ws.playerId),
      role: ws.playerId === room.chooserId ? 'chooser' : 'guest'
    });
    send(ws, publicState(room));
  }
}

async function finish(room, result, reason, winnerId = null) {
  const db = await pool.getConnection();
  let alreadyDone = false;

  try {
    await db.beginTransaction();
    const [[r]] = await db.execute(
      'SELECT status, white_player_id, black_player_id FROM game_rooms WHERE id = ? FOR UPDATE',
      [room.id]
    );

    if (r.status === 'completed') {
      alreadyDone = true;
      await db.commit();
    } else {
      await db.execute(
        'INSERT INTO game_results (room_id, result, reason, winner_player_id) VALUES (?, ?, ?, ?)',
        [room.id, result, reason, winnerId]
      );
      await db.execute("UPDATE game_rooms SET status = 'completed', finished_at = NOW() WHERE id = ?", [room.id]);

      const seats = [
        [r.white_player_id, 'white', r.black_player_id],
        [r.black_player_id, 'black', r.white_player_id]
      ];
      for (const [id, color, other] of seats) {
        if (!id) continue;
        const outcome =
          result === 'draw' ? 'draw'
          : result === 'abandoned' ? 'abandoned'
          : (result === 'white_win') === (color === 'white') ? 'win' : 'loss';
        await db.execute(
          'INSERT INTO match_history (room_id, player_id, opponent_player_id, color, result) VALUES (?, ?, ?, ?, ?)',
          [room.id, id, other, color, outcome]
        );
      }
      await db.commit();
    }
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }

  room.status = 'completed';
  room.pendingDraw = null;
  if (!alreadyDone) everyone(room, { type: 'game-over', result, reason, winner: winnerId });
}

async function authenticate(token) {
  if (!token) throw Error('Login required. Please log in again.');

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw Error('Your session is invalid or expired. Please log in again.');
  }

  if (!claims || !Number.isInteger(claims.playerId)) throw Error('Invalid session. Please log in again.');

  const [players] = await pool.execute(
    'SELECT id, username, display_name FROM players WHERE id = ?',
    [claims.playerId]
  );
  const player = players[0];
  if (!player || player.username !== claims.username) throw Error('Account not found. Please log in again.');
  return player;
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : '';

    req.player = await authenticate(token);
    next();
  } catch (error) {
    res.status(401).json({
      error: error.message || 'Authentication required'
    });
  }
}

async function join(ws, msg) {
  const code = String(msg.roomid ?? '').trim();
  if (!code || code.length > 50) throw Error('Room ID must be 1–50 characters');

  const player = await authenticate(typeof msg.token === 'string' ? msg.token : '');

  if (ws.roomCode && ws.roomCode !== code) leave(ws);

  const room = await loadRoom(code);

  if (room.sockets.has(ws)) return notify(room);

  // Same account reconnecting (refresh, flaky network): replace the old socket.
  const stale = [...room.sockets].find(s => s.playerId === player.id);
  if (stale) {
    room.sockets.delete(stale);
    stale.roomCode = null;
    stale.close();
  }

  if (room.sockets.size >= 2) throw Error('Room already has two connected players');

  if (room.whiteId && room.blackId && player.id !== room.whiteId && player.id !== room.blackId) {
    throw Error('Both seats are reserved');
  }

  if (!room.chooserId) room.chooserId = player.id;

  ws.roomCode = code;
  ws.playerId = player.id;
  ws.name = player.display_name || player.username;
  room.sockets.add(ws);

  // If the first player already picked a colour, give the newcomer the other seat.
  if (player.id !== room.chooserId && (room.whiteId || room.blackId) && !playerColor(room, player.id)) {
    const column = room.whiteId ? 'black_player_id' : 'white_player_id';

    const [update] = await pool.execute(
      `UPDATE game_rooms
       SET ${column} = ?, status = 'active', started_at = COALESCE(started_at, NOW())
       WHERE id = ? AND ${column} IS NULL`,
      [player.id, room.id]
    );

    if (update.affectedRows !== 1) {
      room.sockets.delete(ws);
      ws.roomCode = null;
      throw Error('Seat is no longer available');
    }

    if (column === 'white_player_id') room.whiteId = player.id;
    else room.blackId = player.id;
    room.status = 'active';
  }

  notify(room);
}

async function choose(ws, msg) {
  const room = rooms.get(ws.roomCode);
  if (ws.playerId !== room.chooserId) throw Error('Only the first player can choose');
  if (room.whiteId || room.blackId) throw Error('Side has already been chosen');
  if (!['white', 'black'].includes(msg.color)) throw Error('Invalid side');

  const myCol = msg.color === 'white' ? 'white_player_id' : 'black_player_id';
  const otherCol = msg.color === 'white' ? 'black_player_id' : 'white_player_id';
  const other = [...room.sockets].find(s => s !== ws);
  const otherId = other ? other.playerId : null;

  const [r] = await pool.execute(
    `UPDATE game_rooms
     SET ${myCol} = ?, ${otherCol} = ?, status = ?, started_at = ${otherId ? 'NOW()' : 'NULL'}
     WHERE id = ? AND white_player_id IS NULL AND black_player_id IS NULL`,
    [ws.playerId, otherId, otherId ? 'active' : 'waiting', room.id]
  );
  if (r.affectedRows !== 1) throw Error('Side was already selected');

  room.whiteId = msg.color === 'white' ? ws.playerId : otherId;
  room.blackId = msg.color === 'black' ? ws.playerId : otherId;
  room.status = otherId ? 'active' : 'waiting';
  notify(room);
}

async function move(ws, msg) {
  const room = rooms.get(ws.roomCode);
  if (room.status !== 'active' || room.sockets.size !== 2) throw Error('Waiting for both players');

  const color = playerColor(room, ws.playerId);
  if (!color || room.game.turn() !== (color === 'white' ? 'w' : 'b')) throw Error('Not your turn');

  const input = msg.move;
  if (
    !input ||
    typeof input.from !== 'string' || typeof input.to !== 'string' ||
    !/^[a-h][1-8]$/.test(input.from) || !/^[a-h][1-8]$/.test(input.to)
  ) {
    throw Error('Invalid move');
  }

  const promotion = ['q', 'r', 'b', 'n'].includes(input.promotion) ? input.promotion : 'q';
  const next = new Chess(room.game.fen());
  let m;
  try {
    m = next.move({ from: input.from, to: input.to, promotion });
  } catch {
    throw Error('Illegal move');
  }
  if (!m) throw Error('Illegal move');

  const number = room.moveCount + 1;
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    await db.execute(
      `INSERT INTO game_moves (room_id, move_number, player_id, from_square, to_square, promotion, san, fen_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [room.id, number, ws.playerId, m.from, m.to, m.promotion || null, m.san, next.fen()]
    );
    await db.execute('UPDATE game_rooms SET current_fen = ? WHERE id = ?', [next.fen(), room.id]);
    await db.commit();
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }

  room.game = next;
  room.moveCount = number;
  room.pendingDraw = null;
  everyone(room, {
    type: 'move',
    move: { from: m.from, to: m.to, promotion: m.promotion },
    fen: next.fen(),
    san: m.san
  });

  if (next.isGameOver()) {
    const mate = next.isCheckmate();
    await finish(
      room,
      mate ? (color === 'white' ? 'white_win' : 'black_win') : 'draw',
      mate ? 'checkmate' : next.isStalemate() ? 'stalemate' : 'chess draw',
      mate ? ws.playerId : null
    );
  }
}

function leave(ws) {
  const code = ws.roomCode;
  const room = code ? rooms.get(code) : null;

  if (room && room.sockets.delete(ws)) {
    // If the chooser walks away before picking, let the remaining player choose.
    if (!room.whiteId && !room.blackId && room.chooserId === ws.playerId) {
      const remaining = [...room.sockets][0];
      room.chooserId = remaining ? remaining.playerId : null;
    }
    room.pendingDraw = null;

    if (room.sockets.size) notify(room);
    else rooms.delete(code);
  }
  ws.roomCode = null;
}

async function handleMessage(ws, msg, code) {
  if (msg.type === 'join-room') return join(ws, msg);

  const room = rooms.get(code);
  if (!isMember(room, ws) || String(msg.roomid) !== code) throw Error('Join the correct room first');

  if (msg.type === 'choose-side') return choose(ws, msg);
  if (msg.type === 'move') return move(ws, msg);

  if (room.status !== 'active') throw Error('Game is not active');

  if (msg.type === 'request') {
    room.pendingDraw = ws.playerId;
    for (const other of room.sockets) {
      if (other !== ws) send(other, { type: 'response', msg: `${ws.name} offers a draw. Accept?` });
    }
  } else if (msg.type === 'rejection') {
    if (!room.pendingDraw || room.pendingDraw === ws.playerId) throw Error('No opponent draw offer pending');
    room.pendingDraw = null;
    for (const other of room.sockets) {
      if (other !== ws) send(other, { type: 'rejection', msg: `${ws.name} declined the draw.` });
    }
  } else if (msg.type === 'acceptance') {
    if (!room.pendingDraw || room.pendingDraw === ws.playerId) throw Error('No opponent draw offer pending');
    room.pendingDraw = null;
    await finish(room, 'draw', 'agreement');
  } else if (msg.type === 'resign') {
    const winnerColor = opposite(playerColor(room, ws.playerId));
    const winnerId = winnerColor === 'white' ? room.whiteId : room.blackId;
    await finish(room, winnerColor === 'white' ? 'white_win' : 'black_win', 'resignation', winnerId);
  } else {
    throw Error('Unknown message type');
  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', msg: 'Invalid JSON' });
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    const code = msg.type === 'join-room' ? String(msg.roomid ?? '').trim() : ws.roomCode;
    if (!code) {
      send(ws, { type: 'error', msg: 'Join a room first' });
      return;
    }

    enqueue(code, () => handleMessage(ws, msg, code)).catch((err) => {
      console.error(err.message);
      const room = rooms.get(code);
      if (room && !room.sockets.size) rooms.delete(code);
      send(ws, { type: 'error', msg: err.message });
    });
  });

  ws.on('close', () => leave(ws));
  ws.on('error', (err) => console.error('WebSocket:', err.message));
});

// Drop dead connections (important behind proxies such as Render).
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

/* --------------------------------- startup --------------------------------- */

server.listen(process.env.PORT || 3000, () => {
  console.log('ChessZone server started on port ' + (process.env.PORT || 3000));
});