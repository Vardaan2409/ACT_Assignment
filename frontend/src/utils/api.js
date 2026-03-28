import axios from 'axios';

// Uses VITE_API_URL from .env (production) or .env.local (local dev)
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export default API;
