
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map();

function send(client, data) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

function notifyOpponents(roomid) {
  const clients = rooms.get(roomid);
  if (!clients) return;

  for (const client of clients) {
    const opponents = [...clients]
      .filter(other => other !== client)
      .map(other => other.name);

    send(client, {
      type: 'opponent',
      opponent: opponents,
    });
  }
}

function removeClient(socket) {
  const roomid = socket.roomid;
  if (!roomid || !rooms.has(roomid)) return;

  const clients = rooms.get(roomid);
  clients.delete(socket);

  if (clients.size === 0) {
    rooms.delete(roomid);
  } else {
    notifyOpponents(roomid);
  }

  socket.roomid = null;
}

wss.on('connection', socket => {
  console.log('WebSocket client connected');

  socket.on('message', rawMessage => {
    let message;

    try {
      message = JSON.parse(rawMessage.toString());
    } catch {
      send(socket, {
        type: 'error',
        msg: 'Invalid JSON message',
      });
      return;
    }

    const { type, roomid } = message;

    if (type === 'join-room') {
      if (!roomid || !message.name) {
        send(socket, {
          type: 'error',
          msg: 'Room ID and player name are required',
        });
        return;
      }

      // Avoid adding the same socket to multiple rooms.
      if (socket.roomid) {
        removeClient(socket);
      }

      let clients = rooms.get(roomid);

      if (!clients) {
        clients = new Set();
        rooms.set(roomid, clients);
      }

      if (clients.size >= 2) {
        send(socket, {
          type: 'error',
          msg: 'Two players already exist in this room',
        });

        if (clients.size === 0) rooms.delete(roomid);
        return;
      }

      socket.name = message.name;
      socket.roomid = roomid;
      clients.add(socket);

      console.log(`${socket.name} joined room ${roomid}`);

      notifyOpponents(roomid);
      return;
    }

    // Ignore messages from clients that have not joined a room.
    if (!socket.roomid || socket.roomid !== roomid) {
      send(socket, {
        type: 'error',
        msg: 'Join the correct room before sending messages',
      });
      return;
    }

    const clients = rooms.get(roomid);
    if (!clients) return;

    const broadcastToOthers = data => {
      for (const client of clients) {
        if (client !== socket) {
          send(client, data);
        }
      }
    };

    switch (type) {
      case 'move':
        broadcastToOthers({
          type: 'move',
          move: message.move,
          result: message.result || null,
          winner: message.winner || null,
        });
        break;

      case 'request':
        broadcastToOthers({
          type: 'response',
          msg: `${message.msg}. Would you like to accept it?`,
        });
        break;

      case 'acceptance':
        broadcastToOthers({
          type: 'acceptance',
          msg: 'Accepted request to draw',
        });
        break;

      case 'rejection':
        broadcastToOthers({
          type: 'rejection',
          msg: `${socket.name} has rejected your request`,
        });
        break;

      case 'resign':
        broadcastToOthers({
          type: 'resign',
          msg: message.msg || `${socket.name} resigned`,
        });
        break;

      default:
        send(socket, {
          type: 'error',
          msg: `Unknown message type: ${type}`,
        });
    }
  });

  socket.on('close', () => {
    console.log(`${socket.name || 'Unknown player'} disconnected`);
    removeClient(socket);
  });

  socket.on('error', error => {
    console.error('WebSocket error:', error.message);
  });
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`WebSocket available at ws://localhost:${port}`);
});
