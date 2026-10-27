
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { WS_URL, getToken, getUser, clearSession } from '../auth.js';

const initialFen = new Chess().fen();
const FATAL_ERROR = /session|log in|login|ended|reserved|two connected|account not found/i;

export default function Game() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const roomid = params.get('id');
  const user = getUser();
  const name = user?.displayName || user?.username || 'You';

  const socketRef = useRef(null);
  const gameRef = useRef(new Chess());

  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState(null);
  const [color, setColor] = useState(null);
  const [fen, setFen] = useState(initialFen);
  const [status, setStatus] = useState('waiting');
  const [opponent, setOpponent] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [drawOffer, setDrawOffer] = useState('');
  const [drawRequested, setDrawRequested] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [boardWidth, setBoardWidth] = useState(560);

  const orientation = color === 'black' ? 'black' : 'white';

  // Keep the board inside the screen on phones.
  useEffect(() => {
    const update = () => setBoardWidth(Math.max(280, Math.min(560, window.innerWidth - 80)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const send = useCallback((payload) => {
    const ws = socketRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError('Not connected to the game server. Reconnecting…');
      return false;
    }

    ws.send(JSON.stringify({ ...payload, roomid }));
    return true;
  }, [roomid]);

  // Connect, authenticate with the saved JWT, and reconnect if the link drops.
  useEffect(() => {
    if (!roomid) {
      setError('Missing room ID. Please return to the home page.');
      return undefined;
    }

    let active = true;
    let stopRetrying = false;
    let retryTimer = null;
    let attempts = 0;

    const connect = () => {
      const token = getToken();
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!active) return;
        attempts = 0;
        setConnected(true);
        setError('');
        ws.send(JSON.stringify({ type: 'join-room', roomid, token }));
      };

      ws.onmessage = (event) => {
        if (!active) return;

        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        switch (message.type) {
          case 'error': {
            const text = message.msg || 'Server error';

            if (/session|log in|login|account not found/i.test(text)) {
              stopRetrying = true;
              clearSession();
              navigate('/login', { replace: true });
              return;
            }

            if (FATAL_ERROR.test(text)) stopRetrying = true;
            setError(text);
            break;
          }

          case 'opponent': {
            const names = Array.isArray(message.opponent) ? message.opponent : [];
            setOpponent(names[0] || '');
            break;
          }

          case 'side-assigned':
            setRole(message.role || null);
            setColor(message.color || null);
            break;

          case 'game-state': {
            try {
              const nextGame = new Chess(message.fen || initialFen);
              gameRef.current = nextGame;
              setFen(nextGame.fen());
            } catch {
              setError('Invalid board position received from server.');
            }
            if (message.status) setStatus(message.status);
            break;
          }

          case 'move': {
            try {
              const nextGame = new Chess(message.fen || initialFen);
              gameRef.current = nextGame;
              setFen(nextGame.fen());
              setSelectedSquare(null);
              setDrawOffer('');
              setDrawRequested(false);
              setNotice('');
            } catch {
              setError('Invalid move position received from server.');
            }
            break;
          }

          case 'response':
            setDrawOffer(message.msg || 'Your opponent offers a draw.');
            setDrawRequested(false);
            setNotice('');
            break;

          case 'rejection':
            setDrawRequested(false);
            setDrawOffer('');
            setNotice(message.msg || 'Draw offer declined.');
            break;

          case 'game-over':
            stopRetrying = true;
            setResult({
              result: message.result,
              reason: message.reason || 'Game finished',
              winner: message.winner,
            });
            setStatus('completed');
            setDrawOffer('');
            setDrawRequested(false);
            setSelectedSquare(null);
            break;

          default:
            break;
        }
      };

      ws.onerror = () => {
        if (active) setError('Cannot reach the game server. Retrying…');
      };

      ws.onclose = () => {
        if (!active) return;
        setConnected(false);
        setOpponent('');

        if (!stopRetrying) {
          const delay = Math.min(1000 * 2 ** attempts, 10000);
          attempts += 1;
          retryTimer = setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      active = false;
      clearTimeout(retryTimer);
      const ws = socketRef.current;
      socketRef.current = null;
      if (ws) ws.close();
    };
  }, [roomid, navigate]);

  const chooseSide = (side) => {
    if (send({ type: 'choose-side', color: side })) setError('');
  };

  const canPlay =
    connected && Boolean(opponent) && Boolean(color) && status === 'active' && !result;

  // Validates a move locally, then asks the server to apply it.
  const trySendMove = (from, to) => {
    if (!canPlay) return false;

    const playerColor = color === 'white' ? 'w' : 'b';
    const currentGame = gameRef.current;
    if (currentGame.turn() !== playerColor) return false;

    const testGame = new Chess(currentGame.fen());
    let move;
    try {
      move = testGame.move({ from, to, promotion: 'q' });
    } catch {
      return false;
    }
    if (!move) return false;

    const sent = send({
      type: 'move',
      move: { from: move.from, to: move.to, promotion: move.promotion || 'q' },
    });

    if (sent) setSelectedSquare(null);
    return sent;
  };

  const handleMove = (from, to) => trySendMove(from, to);

  // Tap-to-move for phones and desktops.
  const handleSquareClick = (square) => {
    if (!canPlay) return;

    const playerColor = color === 'white' ? 'w' : 'b';
    const currentGame = gameRef.current;
    if (currentGame.turn() !== playerColor) return;

    const piece = currentGame.get(square);

    if (!selectedSquare) {
      if (piece && piece.color === playerColor) setSelectedSquare(square);
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    if (piece && piece.color === playerColor) {
      setSelectedSquare(square);
      return;
    }

    trySendMove(selectedSquare, square);
  };

  // Highlight the selected piece and where it can go.
  const legalMoveHighlights = {};

  if (selectedSquare && canPlay) {
    const currentGame = gameRef.current;
    const playerColor = color === 'white' ? 'w' : 'b';

    if (currentGame.turn() === playerColor) {
      legalMoveHighlights[selectedSquare] = { background: 'rgba(250, 204, 21, 0.55)' };

      try {
        currentGame.moves({ square: selectedSquare, verbose: true }).forEach((move) => {
          legalMoveHighlights[move.to] = {
            background: currentGame.get(move.to)
              ? 'radial-gradient(circle, rgba(34,197,94,0.35) 85%, transparent 86%)'
              : 'radial-gradient(circle, rgba(34,197,94,0.35) 22%, transparent 24%)',
          };
        });
      } catch {
        // Ignore stale selections.
      }
    }
  }

  const yourTurn =
    Boolean(color) && gameRef.current.turn() === (color === 'white' ? 'w' : 'b');

  const button =
    'rounded-xl px-5 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-40';

  const resultText = () => {
    if (!result) return '';
    if (result.result === 'draw') return 'Game drawn';
    if (result.result === 'abandoned') return 'Game abandoned';
    if (result.result === 'white_win') return 'White wins';
    if (result.result === 'black_win') return 'Black wins';
    return 'Game finished';
  };

  return (
    <div className="min-h-screen bg-[#0b0f0e] px-4 py-8 text-gray-100">
      <div className="mx-auto max-w-5xl space-y-6">

        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#29372f] pb-5">
          <Link to="/home" className="text-2xl font-extrabold">
            ♞ Chess<span className="text-green-500">Zone</span>
          </Link>

          <span className="text-sm">
            {connected ? '🟢 Connected' : '🟡 Connecting…'}
          </span>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase text-green-500">Multiplayer Chess</p>
            <h1 className="text-3xl font-extrabold">Game Arena</h1>
          </div>

          <div className="rounded-xl border border-[#29372f] p-3">
            Room ID: <b className="text-green-400">{roomid || 'Not specified'}</b>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-700 bg-red-950/40 p-4 text-red-300">
            {error}
            {!roomid && (
              <p className="mt-2">
                <Link to="/home" className="underline">Back to home</Link>
              </p>
            )}
          </div>
        )}

        {connected && role === 'chooser' && !color && !result && (
          <section className="mx-auto max-w-xl space-y-5 rounded-2xl border border-[#29372f] bg-[#121916] p-8 text-center">
            <h2 className="text-3xl font-bold">Choose Your Side</h2>

            <p className="text-gray-400">
              You joined first. Your opponent will automatically get the opposite color.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                className={`${button} bg-green-500 text-black`}
                onClick={() => chooseSide('white')}
              >
                ♔ Play as White
              </button>

              <button
                className={`${button} border border-green-700`}
                onClick={() => chooseSide('black')}
              >
                ♚ Play as Black
              </button>
            </div>
          </section>
        )}

        {connected && role === 'guest' && !color && !result && (
          <div className="rounded-xl bg-[#121916] p-6 text-center">
            Waiting for the first player to choose a side…
          </div>
        )}

        {color && !result && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">

            <section className="space-y-4 rounded-2xl border border-[#29372f] bg-[#121916] p-4 sm:p-6">
              <div className="rounded-xl bg-[#0b0f0e] p-4">
                Opponent: <b>{opponent || 'Waiting for opponent — share the Room ID'}</b>
              </div>

              {drawOffer && (
                <div className="space-y-3 rounded-xl border border-green-700 p-4">
                  <p>{drawOffer}</p>

                  <button
                    className={`${button} mr-2 bg-green-500 text-black`}
                    onClick={() => {
                      if (send({ type: 'acceptance' })) setDrawOffer('');
                    }}
                  >
                    Accept Draw
                  </button>

                  <button
                    className={`${button} border border-gray-600`}
                    onClick={() => {
                      if (send({ type: 'rejection' })) setDrawOffer('');
                    }}
                  >
                    Decline
                  </button>
                </div>
              )}

              <div
                className="mx-auto overflow-hidden rounded-lg border-2 border-[#35483b]"
                style={{ width: boardWidth }}
              >
                <Chessboard
                  position={fen}
                  boardWidth={boardWidth}
                  boardOrientation={orientation}
                  onPieceDrop={handleMove}
                  onSquareClick={handleSquareClick}
                  customSquareStyles={legalMoveHighlights}
                  customDarkSquareStyle={{ backgroundColor: '#538568' }}
                  customLightSquareStyle={{ backgroundColor: '#e5e7d5' }}
                  isDraggablePiece={({ piece }) => {
                    if (!canPlay) return false;
                    const playerColor = color === 'white' ? 'w' : 'b';
                    return gameRef.current.turn() === playerColor && piece.startsWith(playerColor);
                  }}
                />
              </div>

              <div className="rounded-xl bg-[#0b0f0e] p-4">
                {name} (You) — <b className="capitalize">{color}</b>
              </div>
            </section>

            <aside className="space-y-4">
              <section className="space-y-2 rounded-2xl border border-[#29372f] bg-[#121916] p-5">
                <h3 className="font-bold text-green-400">Game Status</h3>

                <p className="text-xl font-bold">
                  {!opponent
                    ? 'Waiting for opponent'
                    : status !== 'active'
                      ? 'Waiting for players'
                      : yourTurn
                        ? 'Your turn'
                        : "Opponent's turn"}
                </p>
              </section>

              <section className="space-y-3 rounded-2xl border border-[#29372f] bg-[#121916] p-5">
                <h3 className="font-bold">Game Actions</h3>

                <button
                  disabled={!canPlay || drawRequested}
                  className={`${button} w-full border border-green-700`}
                  onClick={() => {
                    if (send({ type: 'request' })) {
                      setDrawRequested(true);
                      setNotice('Draw offer sent.');
                    }
                  }}
                >
                  {drawRequested ? 'Draw Requested…' : 'Offer a Draw'}
                </button>

                <button
                  disabled={!canPlay}
                  className={`${button} w-full border border-red-700 text-red-400`}
                  onClick={() => send({ type: 'resign' })}
                >
                  Resign Game
                </button>

                {notice && <p className="text-sm text-yellow-400">{notice}</p>}
              </section>
            </aside>
          </div>
        )}

        {result && (
          <section className="mx-auto max-w-xl space-y-4 rounded-2xl border border-[#29372f] bg-[#121916] p-8 text-center">
            <h2 className="text-3xl font-bold">Game Finished</h2>

            <p>{resultText()} — {result.reason}</p>

            <Link
              to="/home"
              className="inline-block rounded-xl bg-green-500 px-6 py-3 font-bold text-black"
            >
              Back to Home
            </Link>
          </section>
        )}

        <footer className="border-t border-[#29372f] pt-5 text-center text-gray-500">
          ChessZone · Every move matters.
        </footer>
      </div>
    </div>
  );
}
