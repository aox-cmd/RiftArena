import { useEffect } from "react";

import { useAuthStore } from "../stores/authStore";
import { useMultiplayerStore } from "../stores/multiplayerStore";

export function useGameConnection() {
  const token = useAuthStore(state => state.token);

  const connect = useMultiplayerStore(
    state => state.connect
  );

  const disconnect = useMultiplayerStore(
    state => state.disconnect
  );

  useEffect(() => {
    if (!token) {
      disconnect();
      return;
    }

    connect(token);

    return () => disconnect();
  }, [token, connect, disconnect]);
}
