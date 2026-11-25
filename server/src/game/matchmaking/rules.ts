export function ratingRange(waitMs: number): number {
  const steps = Math.floor(
    Math.max(0, waitMs) / 15000
  );

  return Math.min(1000, 150 + steps * 150);
}

export function compatibleRatings(
  rating1: number,
  rating2: number,
  waitMs: number
): boolean {
  return Math.abs(rating1 - rating2)
    <= ratingRange(waitMs);
}
