# ChessZone – Real-Time Multiplayer Chess

## Description

ChessZone is a real-time multiplayer chess application built using React, Node.js, Express.js, WebSockets, and MySQL. It allows users to register, log in, create or join game rooms, and play chess with other players online.

## Features

- User registration and login
- Real-time multiplayer chess
- Create and join game rooms
- Choose White or Black
- Real-time move synchronization
- Draw offers and resignation
- Game result display
- User profile and game statistics
- Match history
- MySQL database integration

## Technologies Used

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express.js
- Real-time communication: WebSockets
- Chess logic: chess.js
- Chessboard: react-chessboard
- Database: MySQL
- Authentication: JWT
- Frontend hosting: Vercel
- Backend hosting: Render

## Project Structure

```text
ChessZone/
├── backend/
├── frontend/
├── .gitignore
├── README.md
├── package.json
└── package-lock.json
```

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Manthan1406/ChessZone.git
cd ChessZone
```

### 2. Set Up the Backend

```bash
cd backend
npm install
node index.js
```

Configure the required environment variables and MySQL database before starting the server.

### 3. Set Up the Frontend

Open another terminal and run:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed in the terminal.

## Live Website

Website: https://chess-zone-weld.vercel.app/

Frontend is hosted on Vercel, and the backend is hosted on Render.

## Future Enhancements

- Chess clock and timer
- Player leaderboard and ratings
- Game replay
- Improved matchmaking
- Rematch functionality

## Author

Manthan
