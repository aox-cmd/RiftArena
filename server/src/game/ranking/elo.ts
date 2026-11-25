export const K_FACTOR = 32;

export function expectedScore(
  rating: number,
  opponentRating: number
): number {
  return 1 / (
    1 + Math.pow(10, (opponentRating - rating) / 400)
  );
}

export function calculateRating(
  rating: number,
  opponentRating: number,
  score: 0 | 0.5 | 1
): number {
  const expected = expectedScore(
    rating,
    opponentRating
  );

  return Math.max(
    0,
    rating + Math.round(K_FACTOR * (score - expected))
  );
}

export function getRank(rating: number): string {
  if (rating >= 2100) return "Legend";
  if (rating >= 1800) return "Master";
  if (rating >= 1500) return "Diamond";
  if (rating >= 1300) return "Platinum";
  if (rating >= 1100) return "Gold";
  if (rating >= 900) return "Silver";

  return "Bronze";
}
