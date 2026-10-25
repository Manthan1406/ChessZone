
import React, { useState } from 'react';

function Home() {
  const [name, setname] = useState('');
  const [roomid, setroomid] = useState('');

  const handleclick = () => {
    if (!name.trim() || !roomid.trim()) {
      alert('Please enter your name and game room ID');
      return;
    }

    window.location.href = `/game?name=${encodeURIComponent(name.trim())}&id=${encodeURIComponent(roomid.trim())}`;
  };

  return (
    <div className="min-h-screen bg-[#0b0f0e] px-4 py-8 text-gray-100 sm:px-8">

      {/* Navigation */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between border-b border-[#29372f] pb-5">
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          ♞ Chess<span className="text-green-500">Zone</span>
        </h2>

        <span className="rounded-full border border-green-800 bg-green-950/50 px-4 py-2 text-sm text-green-400">
          Online Chess
        </span>
      </nav>

      {/* Main content */}
      <main className="mx-auto grid max-w-6xl items-center gap-12 py-12 md:grid-cols-2 md:py-20">

        {/* Left section */}
        <section>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-900 bg-green-950/40 px-4 py-2 text-sm text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400"></span>
            Challenge your friends
          </div>

          <h1 className="text-5xl font-black leading-tight tracking-tight text-white sm:text-7xl">
            Your Next Move
            <span className="block text-green-500">Starts Here.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-8 text-gray-400 sm:text-lg">
            Play chess in real time with your friends. Create a room,
            share your room ID, and let the battle of minds begin.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#29372f] bg-[#121916] p-4">
              <div className="mb-2 text-2xl text-green-400">♟</div>
              <h3 className="font-bold text-white">Real-time Gameplay</h3>
              <p className="mt-1 text-sm text-gray-400">
                Play against friends online.
              </p>
            </div>

            <div className="rounded-xl border border-[#29372f] bg-[#121916] p-4">
              <div className="mb-2 text-2xl text-green-400">⚡</div>
              <h3 className="font-bold text-white">Simple to Join</h3>
              <p className="mt-1 text-sm text-gray-400">
                Enter a name and room ID to get started.
              </p>
            </div>
          </div>
        </section>

        {/* Join game card */}
        <section className="rounded-2xl border border-[#29372f] bg-[#121916] p-6 shadow-2xl shadow-green-950/20 sm:p-9">
          <div className="mb-7">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              Ready to play?
            </p>

            <h2 className="mt-3 text-3xl font-extrabold text-white">
              Enter the Arena
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Enter your player details to join your chess game.
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleclick();
            }}
          >
            <div>
              <label htmlFor="playerName" className="mb-2 block text-sm font-medium text-gray-300">
                Player Name
              </label>

              <input
                id="playerName"
                type="text"
                placeholder="Enter your name"
                autoComplete="nickname"
                maxLength={30}
                className="w-full rounded-xl border border-[#35483b] bg-[#0b0f0e] px-4 py-3.5 text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                value={name}
                onChange={(e) => setname(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="roomId" className="mb-2 block text-sm font-medium text-gray-300">
                Game Room ID
              </label>

              <input
                id="roomId"
                type="text"
                placeholder="Enter room ID"
                className="w-full rounded-xl border border-[#35483b] bg-[#0b0f0e] px-4 py-3.5 text-white outline-none transition placeholder:text-gray-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                value={roomid}
                onChange={(e) => setroomid(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-green-500 px-5 py-4 font-bold text-black shadow-lg shadow-green-950/30 transition hover:bg-green-400 active:scale-[0.98]"
            >
              Enter Chess Room
              <span className="text-xl">→</span>
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            Your next move could change everything.
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-[#29372f] py-6 text-sm text-gray-500 sm:flex-row">
        <p>
          ♞ Chess<span className="text-green-500">Zone</span>
        </p>
        <p>Built for chess lovers.</p>
      </footer>
    </div>
  );
}

export default Home;