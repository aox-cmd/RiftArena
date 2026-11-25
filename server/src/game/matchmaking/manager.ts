import { BATTLE_CONFIG } from "../engine/config.js";
import { compatibleRatings } from "./rules.js";
import { createChatMessage } from "../chat/chat.js";
import { applyRankedResult } from "../../services/ranking.service.js";
import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import type { Prisma } from "@prisma/client";

import { prisma } from "../../config/database.js";

import {
  createBattle,
  applyAction,
  applyAutomaticAction
} from "../engine/battle.js";

import type {
  BattleState,
  FighterInput
} from "../engine/types.js";

type Mode = "QUICK" | "RANKED";

interface QueueEntry {
  rating: number;
  joinedAt: number;
  userId: string;
  mode: Mode;
  team: FighterInput[];
}

interface ActiveBattle {
  state: BattleState;
  mode: Mode;
  deadline: number;
  timer?: ReturnType<typeof setTimeout>;
}

const TURN_DURATION = BATTLE_CONFIG.turnDuration;

export class MultiplayerManager {
  private queue = new Map<string, QueueEntry>();

  private battles = new Map<string, ActiveBattle>();

  private playerBattles = new Map<string, string>();

  private pending: Promise<void> = Promise.resolve();

  constructor(private io: Server) {}

  private serialize<T>(task: () => Promise<T>): Promise<T> {
    const result = this.pending.then(task);

    this.pending = result.then(
      () => undefined,
      () => undefined
    );

    return result;
  }

  private room(id: string) {
    return `battle:${id}`;
  }

  private async loadTeam(userId: string) {
    const deck = await prisma.deck.findFirst({
      where: { userId, isActive: true },
      include: {
        characters: {
          orderBy: { position: "asc" },
          include: { character: true }
        }
      }
    });

    if (!deck || deck.characters.length !== 3) {
      throw new Error("Create an active deck first");
    }

    const ids = deck.characters.map(c => c.characterId);

    const owned = await prisma.playerCharacter.count({
      where: {
        userId,
        characterId: { in: ids }
      }
    });

    if (owned !== 3) {
      throw new Error("Invalid character ownership");
    }

    return deck.characters.map(c => c.character);
  }

  joinQueue(userId: string, mode: Mode) {
    return this.serialize(async () => {
      if (this.playerBattles.has(userId)) {
        throw new Error("You are already in a battle");
      }

      if (this.queue.has(userId)) {
        throw new Error("You are already in the queue");
      }

      const team = await this.loadTeam(userId);
      const player = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { rating: true }
      });


      if (!this.io.sockets.adapter.rooms.get(`user:${userId}`)?.size) {
        throw new Error("Player disconnected");
      }

      const opponent = [...this.queue.values()].find(
        entry =>
          entry.mode === mode &&
          entry.userId !== userId &&
          (
            mode === "QUICK" ||
            compatibleRatings(
              player.rating,
              entry.rating,
              Date.now() - entry.joinedAt
            )
          ) &&
          !this.playerBattles.has(entry.userId) &&
          this.io.sockets.adapter.rooms.get(
            `user:${entry.userId}`
          )?.size
      );

      if (!opponent) {
        this.queue.set(userId, {
          rating: player.rating,
          joinedAt: Date.now(),
          userId,
          mode,
          team
        });

        this.io.to(`user:${userId}`).emit(
          "queue:waiting",
          { mode }
        );

        return { status: "WAITING" };
      }

      const id = randomUUID();

      const state = createBattle(
        opponent.userId,
        opponent.team,
        userId,
        team,
        id
      );

      await prisma.match.create({
        data: {
          id,
          player1Id: opponent.userId,
          player2Id: userId,
          mode,
          status: "ACTIVE",
          gameState: state as unknown as Prisma.InputJsonValue
        }
      });

      this.queue.delete(opponent.userId);

      const battle: ActiveBattle = {
        state,
        mode,
        deadline: 0
      };

      this.battles.set(id, battle);

      for (const playerId of state.playerIds) {
        this.playerBattles.set(playerId, id);

        this.io.in(`user:${playerId}`)
          .socketsJoin(this.room(id));
      }

      this.startTimer(battle);

      this.io.to(this.room(id)).emit("battle:found", {
        matchId: id,
        mode,
        state,
        deadline: battle.deadline
      });

      console.log(`Battle created: ${id}`);

      return { status: "MATCHED", matchId: id };
    });
  }

  leaveQueue(userId: string) {
    return this.serialize(async () => {
      this.queue.delete(userId);

      this.io.to(`user:${userId}`).emit("queue:left");

      return { status: "LEFT" };
    });
  }

  private startTimer(battle: ActiveBattle) {
    if (battle.timer) {
      clearTimeout(battle.timer);
    }

    battle.deadline = Date.now() + TURN_DURATION;

    const version = battle.state.version;

    battle.timer = setTimeout(() => {
      void this.serialize(async () => {
        if (
          battle.state.status !== "ACTIVE" ||
          battle.state.version !== version
        ) {
          return;
        }

        const next = applyAutomaticAction(battle.state);

        await this.commit(battle, next);
      }).catch(error => {
        console.error("Automatic action failed:", error);

        if (battle.state.status === "ACTIVE") {
          this.startTimer(battle);

          this.io.to(this.room(battle.state.id))
            .emit("battle:state", {
              state: battle.state,
              deadline: battle.deadline
            });
        }
      });
    }, TURN_DURATION);
  }

  private async commit(
    battle: ActiveBattle,
    next: BattleState
  ) {
    const completed = next.status === "COMPLETED";

    await prisma.$transaction(async tx => {
      const updated = await tx.match.updateMany({
        where: {
          id: next.id,
          status: "ACTIVE"
        },
        data: {
          gameState: next as unknown as Prisma.InputJsonValue,
          status: completed ? "COMPLETED" : "ACTIVE",
          winnerId: next.winnerId,
          finishedAt: completed ? new Date() : null
        }
      });

      if (updated.count !== 1) {
        throw new Error("Match already completed or missing");
      }

      if (completed && battle.mode === "RANKED") {
        await applyRankedResult(
          tx,
          next.playerIds[0],
          next.playerIds[1],
          next.winnerId
        );
      }
    });

    if (battle.timer) {
      clearTimeout(battle.timer);
    }

    battle.state = next;

    if (completed) {
      battle.deadline = 0;
    } else {
      this.startTimer(battle);
    }

    this.io.to(this.room(next.id)).emit("battle:state", {
      state: next,
      deadline: battle.deadline
    });

    if (completed) {
      this.io.to(this.room(next.id)).emit("battle:ended", {
        matchId: next.id,
        winnerId: next.winnerId,
        state: next
      });

      for (const playerId of next.playerIds) {
        this.playerBattles.delete(playerId);
      }

      this.io.in(this.room(next.id))
        .socketsLeave(this.room(next.id));

      this.battles.delete(next.id);

      console.log(`Battle completed: ${next.id}`);
    }
  }

  surrender(userId: string, matchId: string) {
    return this.serialize(async () => {
      const battle = this.battles.get(matchId);

      if (
        !battle ||
        battle.state.status !== "ACTIVE" ||
        this.playerBattles.get(userId) !== matchId ||
        !battle.state.playerIds.includes(userId)
      ) {
        throw new Error("Active match not found");
      }

      const winnerId = battle.state.playerIds.find(
        id => id !== userId
      );

      if (!winnerId) {
        throw new Error("Opponent not found");
      }

      const next = structuredClone(battle.state);

      next.status = "COMPLETED";
      next.winnerId = winnerId;
      next.version += 1;

      next.events.push({
        type: "VICTORY",
        message: "A commander surrendered the battle."
      });

      next.events = next.events.slice(-100);

      await this.commit(battle, next);

      return { winnerId };
    });
  }

  sendChat(
    userId: string,
    username: string,
    matchId: string,
    text: string
  ) {
    return this.serialize(async () => {
      const battle = this.battles.get(matchId);

      if (
        !battle ||
        battle.state.status !== "ACTIVE" ||
        this.playerBattles.get(userId) !== matchId ||
        !battle.state.playerIds.includes(userId)
      ) {
        throw new Error("Active match not found");
      }

      const message = createChatMessage(
        matchId,
        userId,
        username,
        text
      );

      this.io.to(this.room(matchId))
        .emit("chat:message", message);

      return { id: message.id };
    });
  }

  performAction(
    userId: string,
    input: {
      matchId: string;
      fighterId: string;
      abilityId: string;
      targetId?: string;
      expectedVersion: number;
    }
  ) {
    return this.serialize(async () => {
      const battle = this.battles.get(input.matchId);

      if (
        !battle ||
        this.playerBattles.get(userId) !== input.matchId
      ) {
        throw new Error("Battle not found");
      }

      if (Date.now() >= battle.deadline) {
        throw new Error("Turn expired");
      }

      const next = applyAction(battle.state, {
        playerId: userId,
        fighterId: input.fighterId,
        abilityId: input.abilityId,
        targetId: input.targetId,
        expectedVersion: input.expectedVersion
      });

      await this.commit(battle, next);

      return { version: next.version };
    });
  }

  reconnect(socket: Socket, userId: string) {
    return this.serialize(async () => {
      const matchId = this.playerBattles.get(userId);

      if (!matchId) return;

      const battle = this.battles.get(matchId);

      if (!battle) return;

      await socket.join(this.room(matchId));

      socket.emit("battle:reconnected", {
        matchId,
        mode: battle.mode,
        state: battle.state,
        deadline: battle.deadline
      });
    });
  }

  disconnect(userId: string) {
    return this.serialize(async () => {
      const sockets = this.io.sockets.adapter.rooms.get(
        `user:${userId}`
      );

      if (sockets?.size) return;

      this.queue.delete(userId);
    });
  }
}





