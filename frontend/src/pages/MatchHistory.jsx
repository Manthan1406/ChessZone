
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getToken } from '../auth.js';

const API_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');

export default function MatchHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      try {
        const response = await fetch(`${API_URL}/api/history`, {
          headers: {
            Authorization: `Bearer ${getToken()}`
          },
          signal: controller.signal
        });

        if (response.status === 401) {
          navigate('/login', { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error('Unable to load match history.');
        }

        const data = await response.json();
        setHistory(data.history || []);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadHistory();
    return () => controller.abort();
  }, [navigate]);

  const resultStyle = {
    win: 'text-green-400 bg-green-950/40',
    loss: 'text-red-400 bg-red-950/40',
    draw: 'text-yellow-400 bg-yellow-950/40',
    abandoned: 'text-gray-400 bg-gray-800'
  };

  return (
    <div className="min-h-screen bg-[#0b0f0e] px-4 py-8 text-gray-100">
      <div className="mx-auto max-w-5xl space-y-6">

        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#29372f] pb-5">
          <Link to="/home" className="text-2xl font-extrabold">
            ♞ Chess<span className="text-green-500">Zone</span>
          </Link>

          <div className="flex gap-4">
            <Link to="/profile" className="text-green-400 hover:underline">
              My Profile
            </Link>
            <Link to="/home" className="text-gray-300 hover:underline">
              Home
            </Link>
          </div>
        </header>

        <section>
          <h1 className="text-3xl font-extrabold">Match History</h1>
          <p className="mt-2 text-gray-400">
            Review your completed games and results.
          </p>
        </section>

        {loading && (
          <p className="text-gray-400">Loading match history...</p>
        )}

        {error && (
          <div className="rounded-xl border border-red-800 bg-red-950/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="rounded-2xl border border-[#29372f] bg-[#121916] p-10 text-center">
            <p className="text-4xl">♟</p>
            <h2 className="mt-4 text-xl font-bold">No matches yet</h2>
            <p className="mt-2 text-gray-400">
              Play your first game to start building your history.
            </p>
            <Link
              to="/home"
              className="mt-5 inline-block rounded-xl bg-green-500 px-6 py-3 font-bold text-black"
            >
              Play Chess
            </Link>
          </div>
        )}

        {!loading && history.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-2xl border border-[#29372f]">
              <table className="w-full min-w-[650px] text-left">
                <thead className="bg-[#17221b] text-sm text-gray-400">
                  <tr>
                    <th className="p-4">Opponent</th>
                    <th className="p-4">Your Colour</th>
                    <th className="p-4">Result</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((match, index) => (
                    <tr
                      key={`${match.roomId}-${index}`}
                      className="border-t border-[#29372f] hover:bg-[#121916]"
                    >
                      <td className="p-4 font-semibold">
                        {match.opponent || 'Unknown opponent'}
                        <p className="mt-1 text-xs text-gray-500">
                          Room #{match.roomId}
                        </p>
                      </td>

                      <td className="p-4 capitalize">
                        {match.color || '—'}
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-lg px-3 py-1 text-sm font-bold ${
                            resultStyle[match.result] ||
                            'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {match.result
                            ? match.result.charAt(0).toUpperCase() +
                              match.result.slice(1)
                            : 'Unknown'}
                        </span>
                      </td>

                      <td className="p-4 capitalize text-gray-300">
                        {match.reason || '—'}
                      </td>

                      <td className="p-4 text-sm text-gray-400">
                        {match.playedAt
                          ? new Date(match.playedAt).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500">
              Showing up to 100 recent matches.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
