import { randomUUID } from "node:crypto";

export interface ChatMessage {
  id: string;
  matchId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

const lastMessages = new Map<string, number[]>();

export function createChatMessage(
  matchId: string,
  userId: string,
  username: string,
  text: string
): ChatMessage {
  const cleaned = text.trim();

  if (!cleaned || cleaned.length > 200) {
    throw new Error("Message must contain 1-200 characters");
  }

  const now = Date.now();

  const recent = (lastMessages.get(userId) ?? [])
    .filter(time => now - time < 10000);

  if (recent.length >= 5) {
    throw new Error("Sending messages too quickly");
  }

  recent.push(now);
  lastMessages.set(userId, recent);

  return {
    id: randomUUID(),
    matchId,
    userId,
    username,
    text: cleaned,
    createdAt: new Date().toISOString()
  };
}

const cleanup = setInterval(() => {
  const now = Date.now();

  for (const [id, times] of lastMessages) {
    const recent = times.filter(
      time => now - time < 10000
    );

    if (recent.length === 0) {
      lastMessages.delete(id);
    } else {
      lastMessages.set(id, recent);
    }
  }
}, 60000);

cleanup.unref();
