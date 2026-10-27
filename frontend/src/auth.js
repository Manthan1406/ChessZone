
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export { API_URL };

export const WS_URL =
  import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export function getToken() {
  return localStorage.getItem('token');
}

export function getUser() {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function saveSession(data) {
  if (data?.token) {
    localStorage.setItem('token', data.token);
  }

  if (data?.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
  }
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
