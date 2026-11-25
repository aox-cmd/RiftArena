import type { Socket } from "socket.io";
import { z } from "zod";

import {
  MultiplayerManager
} from "../game/matchmaking/manager.js";

const queueSchema = z.object({
  mode: z.enum(["QUICK", "RANKED"])
});

const actionSchema = z.object({
  matchId: z.string().uuid(),
  fighterId: z.string().min(1).max(200),
  abilityId: z.string().min(1).max(100),
  targetId: z.string().max(200).optional(),
  expectedVersion: z.number().int().nonnegative()
});

export function registerMultiplayerEvents(
  socket: Socket,
  manager: MultiplayerManager
) {
  const userId: string = socket.data.user.id;

  let windowStart = Date.now();
  let requests = 0;

  function allowed() {
    if (Date.now() - windowStart >= 1000) {
      windowStart = Date.now();
      requests = 0;
    }

    return ++requests <= 10;
  }

  function respond(
    ack: unknown,
    data: Record<string, unknown>
  ) {
    if (typeof ack === "function") {
      ack(data);
    }
  }

  async function execute(
    ack: unknown,
    task: () => Promise<unknown>
  ) {
    if (!allowed()) {
      respond(ack, {
        ok: false,
        message: "Too many requests"
      });

      return;
    }

    try {
      const data = await task();

      respond(ack, { ok: true, data });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Operation failed";

      respond(ack, {
        ok: false,
        message
      });
    }
  }

  socket.on("queue:join", (input, ack) => {
    void execute(ack, async () => {
      const parsed = queueSchema.safeParse(input);

      if (!parsed.success) {
        throw new Error("Invalid matchmaking mode");
      }

      return manager.joinQueue(
        userId,
        parsed.data.mode
      );
    });
  });

  socket.on("queue:leave", (ack) => {
    void execute(ack, () =>
      manager.leaveQueue(userId)
    );
  });

  socket.on("battle:action", (input, ack) => {
    void execute(ack, async () => {
      const parsed = actionSchema.safeParse(input);

      if (!parsed.success) {
        throw new Error("Invalid battle action");
      }

      return manager.performAction(
        userId,
        parsed.data
      );
    });
  });

  socket.on("battle:surrender", (input, ack) => {
    void execute(ack, async () => {
      const parsed = z.object({
        matchId: z.string().uuid()
      }).safeParse(input);

      if (!parsed.success) {
        throw new Error("Invalid match ID");
      }

      return manager.surrender(
        userId,
        parsed.data.matchId
      );
    });
  });

  socket.on("chat:send", (input, ack) => {
    void execute(ack, async () => {
      const parsed = z.object({
        matchId: z.string().uuid(),
        text: z.string().trim().min(1).max(200)
      }).safeParse(input);

      if (!parsed.success) {
        throw new Error("Invalid chat message");
      }

      return manager.sendChat(
        userId,
        socket.data.user.username,
        parsed.data.matchId,
        parsed.data.text
      );
    });
  });

  socket.on("disconnect", () => {
    void manager.disconnect(userId).catch(console.error);
  });

  void manager.reconnect(socket, userId)
    .catch(console.error);
}


