import { create } from "zustand";
import axios from "axios";

import { api } from "../services/api";
import type { User, AuthResponse } from "../types";

interface AuthStore {
  user: User | null;
  token: string | null;
  initializing: boolean;

  login: (email: string, password: string) => Promise<void>;

  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;

  initialize: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem("riftarena_token"),
  initializing: true,

  login: async (email, password) => {
    const { data } = await api.post<AuthResponse>(
      "/auth/login",
      { email, password }
    );

    localStorage.setItem("riftarena_token", data.token);

    set({
      user: data.user,
      token: data.token
    });
  },

  register: async (username, email, password) => {
    const { data } = await api.post<AuthResponse>(
      "/auth/register",
      { username, email, password }
    );

    localStorage.setItem("riftarena_token", data.token);

    set({
      user: data.user,
      token: data.token
    });
  },

  initialize: async () => {
    if (!get().token) {
      set({ initializing: false });
      return;
    }

    try {
      const { data } = await api.get("/auth/me");

      set({
        user: data.user ?? data,
        initializing: false
      });
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        get().logout();
      }

      set({ initializing: false });
    }
  },

  logout: () => {
    localStorage.removeItem("riftarena_token");

    set({
      user: null,
      token: null
    });
  }
}));
