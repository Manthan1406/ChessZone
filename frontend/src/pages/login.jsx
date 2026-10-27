
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL, saveSession } from '../auth.js';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      saveSession(data);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the server. Check that the backend is running.'
          : err.message || 'Login failed'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0f0e] text-white flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-[#29372f] bg-[#121916] p-8"
      >
        <h1 className="text-3xl font-extrabold text-center">
          ♞ Chess<span className="text-green-500">Zone</span>
        </h1>
        <h2 className="text-xl font-bold">Log in</h2>

        {error && <p className="text-red-400">{error}</p>}

        <input
          className="w-full rounded-lg bg-[#0b0f0e] border border-gray-700 p-3"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />

        <input
          className="w-full rounded-lg bg-[#0b0f0e] border border-gray-700 p-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          className="w-full rounded-lg bg-green-500 p-3 font-bold text-black disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <p className="text-sm text-gray-400">
          Don't have an account? <Link className="text-green-400" to="/register">Register</Link>
        </p>
      </form>
    </main>
  );
}
