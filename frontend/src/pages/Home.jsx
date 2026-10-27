import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from '../auth.js';

export default function Home() {
  const [gameId, setGameId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = getUser();

  const joinGame = (event) => {
    event.preventDefault();
    setError('');

    const id = gameId.trim();

    if (!id) {
      setError('Please enter a Game ID.');
      return;
    }

    if (id.length > 50) {
      setError('Game ID cannot exceed 50 characters.');
      return;
    }

    navigate(`/game?id=${encodeURIComponent(id)}`);
  };

  const randomRoom = () => {
    setGameId(Math.random().toString(36).slice(2, 8));
    setError('');
  };

  const logout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0b0f0e] px-4 py-10 text-gray-100">
      <div className="mx-auto max-w-4xl">

        <header className="mb-16 flex flex-wrap items-center justify-between gap-4">
          <Link to="/home" className="text-3xl font-extrabold">
            ♞ Chess<span className="text-green-500">Zone</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-gray-400">
              {user?.displayName || user?.username}
            </span>
            <button
              onClick={logout}
              className="rounded-xl border border-gray-600 px-4 py-2 transition hover:border-red-500"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="grid gap-10 md:grid-cols-2 md:items-center">
          <section>
            <p className="mb-4 font-bold uppercase tracking-widest text-green-400">
              Online Multiplayer Chess
            </p>

            <h1 className="mb-6 text-5xl font-extrabold leading-tight">
              Every move
              <span className="block text-green-500">matters.</span>
            </h1>

            <p className="text-lg leading-8 text-gray-400">
              Challenge your friends, make your moves, and prove your
              strategy on ChessZone.
            </p>
          </section>

          <section className="rounded-2xl border border-[#29372f] bg-[#121916] p-6 sm:p-8">
            <h2 className="mb-3 text-2xl font-extrabold">Game Arena</h2>

            <p className="mb-6 text-gray-400">
              Enter a Game ID to join a match. Share the same ID with a friend so you land in the same room.
            </p>

            <form onSubmit={joinGame} className="space-y-5">
              <div>
                <label htmlFor="gameId" className="mb-2 block font-semibold">
                  Game ID
                </label>

                <div className="flex gap-2">
                  <input
                    id="gameId"
                    type="text"
                    value={gameId}
                    onChange={(event) => setGameId(event.target.value)}
                    placeholder="Enter Game ID"
                    maxLength={50}
                    autoComplete="off"
                    className="w-full rounded-xl border border-[#35483b] bg-[#0b0f0e] px-4 py-3 outline-none transition focus:border-green-500"
                  />
                  <button
                    type="button"
                    onClick={randomRoom}
                    className="whitespace-nowrap rounded-xl border border-green-700 px-4 py-3"
                  >
                    New ID
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-green-500 px-6 py-3 font-bold text-black transition hover:bg-green-400"
              >
                Join Game
              </button>
            </form>
          </section>
        </main>

        <footer className="mt-16 border-t border-[#29372f] pt-6 text-center text-sm text-gray-500">
          ChessZone · Every move matters.
        </footer>
      </div>
    </div>
  );
}
