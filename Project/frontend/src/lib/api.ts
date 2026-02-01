import axios from "axios";
import { authReady } from "../auth/authReady";
import { getAccessToken } from "../auth/authToken";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  // wait for Supabase auth to be ready
  await authReady;

  const token = getAccessToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
