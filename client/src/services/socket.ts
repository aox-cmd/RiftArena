import { io } from "socket.io-client";

export const socket = io(
  import.meta.env.VITE_SOCKET_URL,
  {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000
  }
);

interface SocketResponse<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

export function socketRequest<T>(
  event: string,
  payload?: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error("Not connected to the game server"));
      return;
    }

    const callback = (
      error: Error | null,
      response: SocketResponse<T>
    ) => {
      if (error) {
        reject(new Error("Server response timed out"));
        return;
      }

      if (!response?.ok) {
        reject(new Error(
          response?.message || "Operation failed"
        ));
        return;
      }

      resolve(response.data as T);
    };

    if (payload === undefined) {
      socket.timeout(8000).emit(event, callback);
    } else {
      socket.timeout(8000).emit(event, payload, callback);
    }
  });
}
