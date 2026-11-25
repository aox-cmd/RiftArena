import { Router } from "express";

import { prisma } from "../config/database.js";
import { requireAuth } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";
import { getRank } from "../game/ranking/elo.js";

const router = Router();

router.get("/leaderboard", async (_req, res) => {
  try {
    const players = await prisma.user.findMany({
      take: 100,
      orderBy: [
        { rating: "desc" },
        { wins: "desc" },
        { id: "asc" }
      ],
      select: {
        id: true,
        username: true,
        rating: true,
        wins: true,
        losses: true
      }
    });

    res.json(
      players.map((player, index) => ({
        ...player,
        position: index + 1,
        rank: getRank(player.rating),
        winRate:
          player.wins + player.losses === 0
            ? 0
            : Math.round(
                player.wins /
                (player.wins + player.losses) * 100
              )
      }))
    );
  } catch {
    res.status(500).json({
      message: "Could not load leaderboard"
    });
  }
});

router.get("/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const matches = await prisma.match.findMany({
      where: {
        status: "COMPLETED",
        OR: [
          { player1Id: userId },
          { player2Id: userId }
        ]
      },
      orderBy: { finishedAt: "desc" },
      take: 30,
      select: {
        id: true,
        mode: true,
        winnerId: true,
        createdAt: true,
        finishedAt: true,
        player1: {
          select: { id: true, username: true }
        },
        player2: {
          select: { id: true, username: true }
        }
      }
    });

    res.json(matches.map(match => ({
      id: match.id,
      mode: match.mode,
      finishedAt: match.finishedAt,
      duration: match.finishedAt
        ? Math.max(0, Math.round(
            (match.finishedAt.getTime() -
             match.createdAt.getTime()) / 1000
          ))
        : 0,
      opponent:
        match.player1.id === userId
          ? match.player2.username
          : match.player1.username,
      result:
        match.winnerId === null
          ? "DRAW"
          : match.winnerId === userId
            ? "VICTORY"
            : "DEFEAT"
    })));
  } catch {
    res.status(500).json({
      message: "Could not load match history"
    });
  }
});

export default router;
