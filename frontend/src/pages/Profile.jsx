
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getToken, clearSession } from '../auth.js';

const API_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const response = await fetch(`${API_URL}/api/profile`, {
          headers: {
            Authorization: `Bearer ${getToken()}`
          },
          signal: controller.signal
        });

        if (response.status === 401) {
          clearSession();
          navigate('/login', { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error('Could not load profile');
        }

        const data = await response.json();
        setProfile(data.profile);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => controller.abort();
  }, [navigate]);

  const stats = profile ? [
    { label: 'Games Played', value: profile.gamesPlayed, color: 'text-white' },
    { label: 'Wins', value: profile.wins, color: 'text-green-400' },
    { label: 'Losses', value: profile.losses, color: 'text-red-400' },
    { label: 'Draws', value: profile.draws, color: 'text-yellow-400' }
  ] : [];

  return (
    <div className="min-h-screen bg-[#0b0f0e] px-4 py-8 text-gray-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#29372f] pb-5">
          <Link to="/home" className="text-2xl font-extrabold">
            ♞ Chess<span className="text-green-500">Zone</span>
          </Link>
          <Link to="/home" className="rounded-lg border border-green-700 px-4 py-2">
            Back to Home
          </Link>
        </header>

        {loading && <p className="text-center">Loading profile...</p>}

        {error && (
          <p className="rounded-xl border border-red-700 p-4 text-red-400">
            {error}
          </p>
        )}

        {profile && (
          <>
            <section className="flex flex-wrap items-center gap-6 rounded-2xl border border-[#29372f] bg-[#121916] p-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-600 text-4xl font-bold">
                {profile.username.charAt(0).toUpperCase()}
              </div>

              <div>
                <h1 className="text-3xl font-extrabold">
                  {profile.displayName}
                </h1>
                <p className="text-gray-400">@{profile.username}</p>
                <p className="mt-2 text-sm text-gray-400">
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold">Player Statistics</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {stats.map(stat => (
                  <div key={stat.label} className="rounded-2xl border border-[#29372f] bg-[#121916] p-5 text-center">
                    <p className="text-sm text-gray-400">{stat.label}</p>
                    <p className={`mt-2 text-4xl font-extrabold ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#29372f] bg-[#121916] p-6">
              <h2 className="mb-4 text-xl font-bold">Win Rate</h2>
              <div className="mb-3 flex justify-between">
                <span className="text-gray-400">Overall performance</span>
                <span className="font-bold text-green-400">{profile.winRate}%</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, profile.winRate))}%` }}
                />
              </div>
            </section>

            <Link
              to="/match-history"
              className="block rounded-xl bg-green-500 px-6 py-4 text-center font-bold text-black hover:bg-green-400"
            >
              View Match History
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
