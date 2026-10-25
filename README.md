# ♟️ ChessZone — Real-Time Multiplayer Chess

ChessZone is a real-time multiplayer chess application built with React, Node.js, Express.js, and WebSockets. Players can create or join a room, choose their side, and play chess against another player with live move synchronization.

## ✨ Features

- ♟️ **Real-Time Multiplayer:** Play chess with another player over WebSockets.
- 🏠 **Room-Based Gameplay:** Join a game using a shared room ID.
- ♔ **Choose Your Side:** Play as White or Black.
- 🔄 **Live Move Synchronization:** Moves are communicated between connected players.
- 🤝 **Draw Requests:** Offer, accept, or reject a draw.
- 🏳️ **Resignation:** Resign from an ongoing game.
- ⚖️ **Chess Rules:** Chess logic is handled using [chess.js](https://github.com/jhlywa/chess.js).
- 🎨 **Modern Interface:** Dark-themed interface with green accents, built with React and Tailwind CSS.
- ☁️ **Online Deployment:** Frontend hosted on Vercel and backend hosted on Render.

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite |
| Styling | Tailwind CSS |
| Chessboard | react-chessboard |
| Chess Logic | chess.js |
| Backend | Node.js, Express.js |
| Real-Time Communication | WebSockets (`ws`) |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

## 📁 Project Structure

```text
ChessZone/
├── backend/
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   └── Game.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

Install the following before running the project locally:

- [Node.js](https://nodejs.org/) (version 18 or later recommended)
- npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Manthan1406/ChessZone.git
cd ChessZone
```

### 2. Set Up the Backend

Open a terminal in the project directory and run:

```bash
cd backend
npm install
```

Start the backend server:

```bash
node index.js
```

The backend uses the port configured in the server code, typically port `3000` locally. When deployed on Render, it uses the port provided by the hosting environment.

Keep the backend terminal running.

### 3. Set Up the Frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

## 🌐 Live Deployment

ChessZone is deployed online and can be accessed through the following services:

- **Live Website:** https://chess-zone-weld.vercel.app/
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Render
- **Real-Time Communication:** WebSockets over a secure connection (`wss://`)

The frontend communicates with the deployed backend through the `VITE_WS_URL` environment variable configured in Vercel.

### Local Development

To run ChessZone locally, start the backend and frontend separately using the instructions in the Getting Started section.

## 🎮 How to Play

1. Open ChessZone in your browser.
2. Enter your name and a room ID on the home page.
3. Join the game and choose White or Black.
4. Share the same room ID with your opponent.
5. Wait for your opponent to connect.
6. Take turns moving pieces on the chessboard.
7. Use the game controls to offer a draw or resign when needed.

Both players must connect to the same room to play together.


## 📌 Future Improvements

- Restore the current game position when a player reconnects.
- Persist game sessions and move history.
- Add player authentication and profiles.
- Add a chess clock and move timer.
- Improve matchmaking and room management.
- Add a game history and rematch feature.
- Improve error handling and reconnection behavior.


