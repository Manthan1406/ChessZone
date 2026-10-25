

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const WS_URL = 'ws://localhost:3000';

function Game() {
  const [searchParams] = useSearchParams();
  const socketRef = useRef(null);

  const [iserror, setiserror] = useState(false);
  const [errormessage, seterrormessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [game, setgame] = useState(null);
  const [fen, setFen] = useState(new Chess().fen());
  const [orientation, setorientation] = useState('white');
  const [opponent, setopponent] = useState('');

  const name = searchParams.get('name') || 'Player';
  const roomid = searchParams.get('id');

  const [iswon, setiswon] = useState(false);
  const [isdraw, setisdraw] = useState(false);
  const [isStalemate, setisstalemate] = useState(false);
  const [winner, setwinner] = useState('');

  const [isdrawnotification, setisdrawnotification] = useState(false);
  const [drawmessage, setdrawmessage] = useState('');
  const [drawrequest, setdrawrequest] = useState(false);
  const [rejectmessage, setrejectmessage] = useState('');

  const [isresign, setisresign] = useState(false);
  const [wonbyresign, setwonbyresign] = useState('');

  const sendMessage = useCallback((message) => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setiserror(true);
      seterrormessage(
        'Not connected to the game server. Please refresh.'
      );
      return false;
    }

    socket.send(JSON.stringify({
      ...message,
      roomid,
    }));

    return true;
  }, [roomid]);

  useEffect(() => {
    if (!roomid) {
      setiserror(true);
      seterrormessage(
        'Missing room ID. Please return to the home page.'
      );
      return;
    }

    let active = true;
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      if (!active) return;

      setConnected(true);
      setiserror(false);

      socket.send(JSON.stringify({
        type: 'join-room',
        name,
        roomid,
      }));
    };

    socket.onmessage = (event) => {
      if (!active) return;

      let message;

      try {
        message = JSON.parse(event.data);
      } catch {
        console.error('Invalid server message:', event.data);
        return;
      }

      switch (message.type) {
        case 'error':
          setiserror(true);
          seterrormessage(message.msg || 'Server error');
          break;

        case 'opponent': {
          const opponents = Array.isArray(message.opponent)
            ? message.opponent
            : [];

          setopponent(opponents[0] || '');
          break;
        }

        case 'move': {
          setgame((currentGame) => {
            const nextGame = currentGame
              ? new Chess(currentGame.fen())
              : new Chess();

            try {
              nextGame.move(message.move);
              setFen(nextGame.fen());
            } catch (error) {
              console.error(
                'Could not apply opponent move:',
                error
              );
              return currentGame;
            }

            return nextGame;
          });

          if (message.result === 'won') {
            setwinner(message.winner || 'Opponent');
            setiswon(true);
          } else if (message.result === 'draw') {
            setisdraw(true);
          } else if (message.result === 'stalemate') {
            setisstalemate(true);
          }
          break;
        }

        case 'response':
          setisdrawnotification(true);
          setdrawmessage(
            message.msg || 'Your opponent requests a draw.'
          );
          break;

        case 'acceptance':
          setisdraw(true);
          setgame(null);
          break;

        case 'rejection':
          setdrawrequest(false);
          setisdraw(false);
          setrejectmessage(
            message.msg || 'Draw request rejected.'
          );
          break;

        case 'resign':
          setgame(null);
          setiswon(true);
          setwinner(name);
          setwonbyresign(
            message.msg || 'Your opponent resigned.'
          );
          break;

        default:
          console.log('Unhandled server message:', message);
      }
    };

    socket.onerror = () => {
      if (!active) return;

      setiserror(true);
      seterrormessage(
        'Cannot connect to the game server on port 3000.'
      );
    };

    socket.onclose = () => {
      if (!active) return;

      setConnected(false);
      setopponent('');
    };

    return () => {
      active = false;
      socket.close();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [name, roomid]);

  const handleSideSelect = (side) => {
    const chess = new Chess();

    setgame(chess);
    setFen(chess.fen());
    setorientation(side);

    setisdraw(false);
    setisdrawnotification(false);
    setdrawrequest(false);
    setiswon(false);
    setisstalemate(false);
    setisresign(false);
    setwinner('');
    setwonbyresign('');
    setrejectmessage('');
  };

  const handlemove = (from, to) => {
    if (
      !game ||
      !opponent ||
      !connected ||
      iswon ||
      isdraw ||
      isStalemate
    ) {
      return false;
    }

    const chess = new Chess(game.fen());
    let move;

    try {
      move = chess.move({
        from,
        to,
        promotion: 'q',
      });
    } catch {
      return false;
    }

    if (!move) return false;

    let result = null;

    if (chess.isCheckmate()) {
      result = 'won';
    } else if (chess.isStalemate()) {
      result = 'stalemate';
    } else if (chess.isDraw()) {
      result = 'draw';
    }

    setgame(chess);
    setFen(chess.fen());

    if (result === 'won') {
      setiswon(true);
      setwinner(name);
    } else if (result === 'draw') {
      setisdraw(true);
    } else if (result === 'stalemate') {
      setisstalemate(true);
    }

    sendMessage({
      type: 'move',
      move: {
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      },
      result,
      winner: name,
    });

    return true;
  };

  const handledraw = () => {
    if (!opponent || !connected) return;

    if (sendMessage({
      type: 'request',
      msg: `${name} requests a draw`,
    })) {
      setdrawrequest(true);
      setrejectmessage('');
    }
  };

  const acceptdraw = () => {
    if (sendMessage({ type: 'acceptance' })) {
      setisdraw(true);
      setisdrawnotification(false);
      setgame(null);
    }
  };

  const rejectdraw = () => {
    if (sendMessage({ type: 'rejection' })) {
      setisdrawnotification(false);
      setisdraw(false);
    }
  };

  const handleresign = () => {
    if (!opponent || !connected) return;

    if (sendMessage({
      type: 'resign',
      msg: `${name} has resigned. You have won!`,
    })) {
      setisresign(true);
      setgame(null);
    }
  };

  const gameFinished =
    iswon || isdraw || isStalemate || isresign;

  const primaryButton =
    'rounded-xl bg-green-500 px-5 py-3 font-bold text-black ' +
    'transition hover:bg-green-400 active:scale-[0.98] ' +
    'disabled:cursor-not-allowed disabled:opacity-40';

  const secondaryButton =
    'rounded-xl border border-[#35483b] bg-[#18221d] ' +
    'px-5 py-3 font-semibold text-gray-200 transition ' +
    'hover:border-green-700 hover:bg-[#223329]';

  return (
    <div className="min-h-screen bg-[#0b0f0e] px-4 py-6 text-gray-100 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#29372f] pb-5">
          <Link to="/" className="text-2xl font-extrabold tracking-tight text-white">
            ♞ Chess<span className="text-green-500">Zone</span>
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-[#29372f] bg-[#121916] px-4 py-2 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? 'bg-green-400' : 'bg-yellow-500'
              }`}
            />
            <span className="text-gray-300">
              {connected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </header>

        {/* Room information */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-green-500">
              Multiplayer Chess
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
              Game Arena
            </h1>
          </div>

          <div className="rounded-xl border border-[#29372f] bg-[#121916] px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Room ID
            </p>
            <p className="mt-1 font-bold text-green-400">
              {roomid || 'Not specified'}
            </p>
          </div>
        </div>

        {/* Connection error */}
        {iserror && (
          <div className="rounded-2xl border border-red-900 bg-red-950/40 p-5">
            <h2 className="text-lg font-bold text-red-400">
              Connection problem
            </h2>
            <p className="mt-2 text-sm text-red-200">
              {errormessage}
            </p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-900/40"
            >
              Return Home
            </Link>
          </div>
        )}

        {/* Waiting for server */}
        {!connected && !iserror && (
          <div className="rounded-2xl border border-[#29372f] bg-[#121916] p-5 text-center text-gray-400">
            <p className="font-semibold text-white">
              Connecting to ChessZone...
            </p>
            <p className="mt-1 text-sm">
              Waiting for the game server.
            </p>
          </div>
        )}

        {/* Choose side */}
        {!game && !iserror && !iswon && !isdraw && !isresign && !isStalemate && (
          <section className="mx-auto w-full max-w-xl rounded-2xl border border-[#29372f] bg-[#121916] p-6 text-center shadow-2xl shadow-green-950/20 sm:p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-green-800 bg-green-950/50 text-4xl text-green-400">
              ♟
            </div>

            <h2 className="text-3xl font-extrabold text-white">
              Choose Your Side
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Welcome, {name}. Choose your pieces to get started.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => handleSideSelect('white')}
                disabled={!connected}
                className={primaryButton}
              >
                ♔ Play as White
              </button>

              <button
                onClick={() => handleSideSelect('black')}
                disabled={!connected}
                className={secondaryButton}
              >
                ♚ Play as Black
              </button>
            </div>

            <p className="mt-6 text-xs text-gray-500">
              You can start moving when your opponent joins.
            </p>
          </section>
        )}

        {/* Active game */}
        {game && !iserror && (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">

            {/* Chessboard panel */}
            <section className="min-w-0 rounded-2xl border border-[#29372f] bg-[#121916] p-3 shadow-2xl shadow-black/20 sm:p-6">

              {/* Opponent information */}
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#29372f] bg-[#0b0f0e] p-3 sm:p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#223329] text-2xl">
                  ♚
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    {opponent || 'Waiting for opponent'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {opponent
                      ? 'Your opponent'
                      : 'Share your room ID to invite a player'}
                  </p>
                </div>

                <span className="rounded-full bg-[#18221d] px-3 py-1 text-xs text-green-400">
                  {opponent ? 'Joined' : 'Waiting'}
                </span>
              </div>

              {/* Incoming draw request */}
              {isdrawnotification && (
                <div className="mb-4 rounded-xl border border-green-800 bg-green-950/30 p-4">
                  <p className="text-sm text-green-100">
                    {drawmessage}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      onClick={acceptdraw}
                      className={primaryButton}
                    >
                      Accept Draw
                    </button>

                    <button
                      onClick={rejectdraw}
                      className={secondaryButton}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Chessboard */}
              <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-lg border-2 border-[#35483b] shadow-2xl shadow-black/40">
                <Chessboard
                  position={fen}
                  onPieceDrop={handlemove}
                  boardWidth={560}
                  boardOrientation={orientation}
                  customDarkSquareStyle={{ backgroundColor: '#538568' }}
                  customLightSquareStyle={{ backgroundColor: '#e5e7d5' }}
                  isDraggablePiece={({ piece }) => {
                    if (
                      !game ||
                      !opponent ||
                      !connected ||
                      iswon ||
                      isdraw ||
                      isStalemate
                    ) {
                      return false;
                    }

                    const playerColor =
                      orientation === 'white' ? 'w' : 'b';

                    return (
                      game.turn() === playerColor &&
                      piece.startsWith(playerColor)
                    );
                  }}
                />
              </div>

              {/* Current player */}
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#29372f] bg-[#0b0f0e] p-3 sm:p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#223329] text-2xl">
                  ♟
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    {name} (You)
                  </p>
                  <p className="text-xs text-gray-500">
                    Playing as {orientation}
                  </p>
                </div>

                <span className="rounded-full border border-[#35483b] px-3 py-1 text-xs capitalize text-gray-300">
                  {orientation}
                </span>
              </div>
            </section>

            {/* Game controls sidebar */}
            <aside className="flex flex-col gap-4">

              {/* Game status */}
              <section className="rounded-2xl border border-[#29372f] bg-[#121916] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
                  Game Status
                </p>

                <h2 className="mt-3 text-xl font-bold text-white">
                  {gameFinished
                    ? 'Game Over'
                    : !opponent
                      ? 'Waiting for player'
                      : !connected
                        ? 'Reconnecting...'
                        : game.turn() ===
                            (orientation === 'white' ? 'w' : 'b')
                          ? 'Your turn'
                          : "Opponent's turn"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {!opponent
                    ? 'Waiting for your opponent to join the room.'
                    : gameFinished
                      ? 'This game has ended.'
                      : 'Make your move on the chessboard.'}
                </p>
              </section>

              {/* Room details */}
              <section className="rounded-2xl border border-[#29372f] bg-[#121916] p-5">
                <h3 className="font-bold text-white">
                  Room Details
                </h3>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs text-gray-500">Player</p>
                    <p className="mt-1 break-words text-sm font-medium text-gray-200">
                      {name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Opponent</p>
                    <p className="mt-1 break-words text-sm font-medium text-gray-200">
                      {opponent || 'Not connected yet'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Room ID</p>
                    <p className="mt-1 break-all text-sm font-medium text-green-400">
                      {roomid}
                    </p>
                  </div>
                </div>
              </section>

              {/* Draw and resign controls */}
              <section className="rounded-2xl border border-[#29372f] bg-[#121916] p-5">
                <h3 className="font-bold text-white">
                  Game Actions
                </h3>

                <div className="mt-4 flex flex-col gap-3">
                  <button
                    onClick={handledraw}
                    disabled={!opponent || !connected || drawrequest || gameFinished}
                    className={secondaryButton}
                  >
                    {drawrequest ? 'Draw Requested...' : 'Offer a Draw'}
                  </button>

                  <button
                    onClick={handleresign}
                    disabled={!opponent || !connected || gameFinished}
                    className="rounded-xl border border-red-900 bg-red-950/30 px-5 py-3 font-semibold text-red-400 transition hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Resign Game
                  </button>
                </div>

                {rejectmessage && (
                  <p className="mt-3 text-sm text-yellow-400">
                    {rejectmessage}
                  </p>
                )}
              </section>
            </aside>
          </div>
        )}

        {/* Game results */}
        {(iswon || isdraw || isStalemate || isresign) && (
          <section className="mx-auto w-full max-w-xl rounded-2xl border border-[#29372f] bg-[#121916] p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-950/50 text-4xl text-green-400">
              {isdraw || isStalemate ? '🤝' : '♛'}
            </div>

            <h2 className="mt-5 text-3xl font-extrabold text-white">
              {isdraw
                ? 'Game Drawn'
                : isStalemate
                  ? 'Stalemate'
                  : 'Game Finished'}
            </h2>

            {wonbyresign && (
              <p className="mt-3 text-sm text-gray-400">
                {wonbyresign}
              </p>
            )}

            {iswon && (
              <p className="mt-3 text-lg font-semibold text-green-400">
                {winner} has won the game.
              </p>
            )}

            {isdraw && (
              <p className="mt-3 text-gray-400">
                Draw between both players.
              </p>
            )}

            {isStalemate && (
              <p className="mt-3 text-gray-400">
                The game ended in stalemate.
              </p>
            )}

            {isresign && !iswon && (
              <p className="mt-3 text-gray-400">
                You have resigned from the game.
              </p>
            )}

            <Link
              to="/"
              className="mt-7 inline-flex rounded-xl bg-green-500 px-6 py-3 font-bold text-black transition hover:bg-green-400"
            >
              Back to Home
            </Link>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-4 border-t border-[#29372f] py-5 text-center text-sm text-gray-500">
          Chess<span className="text-green-500">Zone</span>
          <span className="mx-2">·</span>
          Every move matters.
        </footer>
      </div>
    </div>
  );
}

export default Game;
