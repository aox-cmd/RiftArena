import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("riftarena_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message
      || error.message
      || "Request failed";
  }

  return "Something went wrong";
}
