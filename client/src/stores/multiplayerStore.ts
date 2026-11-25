import { create } from "zustand";

import {
  socket,
  socketRequest
} from "../services/socket";

import type {
  BattleState,
  BattlePayload,
  BattleAction,
  MatchMode
} from "../types/battle";

interface MultiplayerStore {
  connected: boolean;
  searching: boolean;
  busy: boolean;

  mode: MatchMode;
  battle: BattleState | null;
  deadline: number;
  error: string;

  connect: (token: string) => void;
  disconnect: () => void;

  joinQueue: (mode: MatchMode) => Promise<void>;
  leaveQueue: () => Promise<void>;
  performAction: (action: BattleAction) => Promise<void>;

  clearBattle: () => void;
  clearError: () => void;
}

export const useMultiplayerStore =
  create<MultiplayerStore>((set, get) => ({
    connected: false,
    searching: false,
    busy: false,

    mode: "QUICK",
    battle: null,
    deadline: 0,
    error: "",

    connect: token => {
      socket.auth = { token };

      if (!socket.connected) {
        socket.connect();
      }
    },

    disconnect: () => {
      socket.disconnect();

      set({
        connected: false,
        searching: false,
        busy: false,
        battle: null,
        deadline: 0,
        error: ""
      });
    },

    joinQueue: async mode => {
      const current = get();

      if (
        current.busy ||
        current.searching ||
        current.battle?.status === "ACTIVE"
      ) return;

      set({ busy: true, error: "", mode });

      try {
        await socketRequest("queue:join", { mode });
      } catch (error) {
        set({
          error: error instanceof Error
            ? error.message
            : "Matchmaking failed"
        });
      } finally {
        set({ busy: false });
      }
    },

    leaveQueue: async () => {
      if (get().busy) return;

      set({ busy: true, error: "" });

      try {
        await socketRequest("queue:leave");
        set({ searching: false });
      } catch (error) {
        set({
          error: error instanceof Error
            ? error.message
            : "Could not cancel matchmaking"
        });
      } finally {
        set({ busy: false });
      }
    },

    performAction: async action => {
      if (get().busy) return;

      set({ busy: true, error: "" });

      try {
        await socketRequest("battle:action", action);
      } catch (error) {
        set({
          error: error instanceof Error
            ? error.message
            : "Action failed"
        });
      } finally {
        set({ busy: false });
      }
    },

    clearBattle: () => {
      if (get().battle?.status === "ACTIVE") return;

      set({
        battle: null,
        deadline: 0,
        error: ""
      });
    },

    clearError: () => set({ error: "" })
  }));

socket.on("connect", () => {
  useMultiplayerStore.setState({
    connected: true,
    error: ""
  });
});

socket.on("disconnect", () => {
  useMultiplayerStore.setState({
    connected: false,
    searching: false,
    busy: false
  });
});

socket.on("connect_error", error => {
  useMultiplayerStore.setState({
    connected: false,
    error: error.message
  });
});

socket.on("queue:waiting", ({ mode }: { mode: MatchMode }) => {
  useMultiplayerStore.setState({
    searching: true,
    mode,
    error: ""
  });
});

socket.on("queue:left", () => {
  useMultiplayerStore.setState({
    searching: false
  });
});

function receiveBattle(payload: BattlePayload) {
  useMultiplayerStore.setState({
    searching: false,
    mode: payload.mode,
    battle: payload.state,
    deadline: payload.deadline,
    error: ""
  });
}

socket.on("battle:found", receiveBattle);
socket.on("battle:reconnected", receiveBattle);

socket.on("battle:state", (
  payload: { state: BattleState; deadline: number }
) => {
  const current = useMultiplayerStore.getState().battle;

  if (
    current?.id === payload.state.id &&
    current.version > payload.state.version
  ) return;

  useMultiplayerStore.setState({
    battle: payload.state,
    deadline: payload.deadline
  });
});

socket.on("battle:ended", (
  payload: { state: BattleState }
) => {
  useMultiplayerStore.setState({
    battle: payload.state,
    deadline: 0,
    searching: false,
    busy: false
  });
});
