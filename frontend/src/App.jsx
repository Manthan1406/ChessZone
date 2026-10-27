
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Game from './pages/Game.jsx';
import Login from './pages/login.jsx';
import Register from './pages/register.jsx';
import { getToken } from './auth.js';

// Only logged-in users may see the lobby and the game.
function RequireAuth({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

// Logged-in users skip the login and register pages.
function PublicOnly({ children }) {
  return getToken() ? <Navigate to="/home" replace /> : children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/game" element={<RequireAuth><Game /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
