import type { Prisma } from "@prisma/client";

import { calculateRating } from "../game/ranking/elo.js";

export async function applyRankedResult(
  tx: Prisma.TransactionClient,
  player1Id: string,
  player2Id: string,
  winnerId: string | null
) {
  if (
    winnerId !== null &&
    winnerId !== player1Id &&
    winnerId !== player2Id
  ) {
    throw new Error("Invalid match winner");
  }

  const [p1, p2] = await Promise.all([
    tx.user.findUniqueOrThrow({
      where: { id: player1Id }
    }),

    tx.user.findUniqueOrThrow({
      where: { id: player2Id }
    })
  ]);

  const score1 =
    winnerId === null
      ? 0.5
      : winnerId === p1.id ? 1 : 0;

  const score2 =
    winnerId === null
      ? 0.5
      : winnerId === p2.id ? 1 : 0;

  const rating1 = calculateRating(
    p1.rating,
    p2.rating,
    score1
  );

  const rating2 = calculateRating(
    p2.rating,
    p1.rating,
    score2
  );

  await tx.user.update({
    where: { id: p1.id },
    data: {
      rating: rating1,
      wins: { increment: score1 === 1 ? 1 : 0 },
      losses: { increment: score1 === 0 ? 1 : 0 }
    }
  });

  await tx.user.update({
    where: { id: p2.id },
    data: {
      rating: rating2,
      wins: { increment: score2 === 1 ? 1 : 0 },
      losses: { increment: score2 === 0 ? 1 : 0 }
    }
  });

  return [
    {
      userId: p1.id,
      previousRating: p1.rating,
      rating: rating1,
      change: rating1 - p1.rating
    },
    {
      userId: p2.id,
      previousRating: p2.rating,
      rating: rating2,
      change: rating2 - p2.rating
    }
  ];
}
