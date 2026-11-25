import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";

export class DeckError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

const deckInclude = {
  characters: {
    orderBy: { position: "asc" as const },
    include: { character: true }
  }
};

type Tx = Prisma.TransactionClient;

async function lockPlayer(tx: Tx, userId: string) {
  await tx.$queryRaw`
    SELECT id FROM User
    WHERE id = ${userId}
    FOR UPDATE
  `;
}

async function validateCharacters(
  tx: Tx,
  userId: string,
  characterIds: string[]
) {
  if (
    characterIds.length !== 3 ||
    new Set(characterIds).size !== 3
  ) {
    throw new DeckError(
      400,
      "Select exactly three different characters"
    );
  }

  const owned = await tx.playerCharacter.count({
    where: {
      userId,
      characterId: { in: characterIds }
    }
  });

  if (owned !== 3) {
    throw new DeckError(
      403,
      "You do not own all selected characters"
    );
  }
}

export function getDecks(userId: string) {
  return prisma.deck.findMany({
    where: { userId },
    include: deckInclude,
    orderBy: { createdAt: "asc" }
  });
}

export function createDeck(
  userId: string,
  name: string,
  characterIds: string[]
) {
  return prisma.$transaction(async tx => {
    await lockPlayer(tx, userId);
    await validateCharacters(tx, userId, characterIds);

    const count = await tx.deck.count({
      where: { userId }
    });

    if (count >= 10) {
      throw new DeckError(400, "Maximum of 10 decks reached");
    }

    const active = await tx.deck.count({
      where: { userId, isActive: true }
    });

    return tx.deck.create({
      data: {
        userId,
        name,
        isActive: active === 0,
        characters: {
          create: characterIds.map((characterId, position) => ({
            characterId,
            position
          }))
        }
      },
      include: deckInclude
    });
  });
}

export function updateDeck(
  userId: string,
  deckId: string,
  name: string,
  characterIds: string[]
) {
  return prisma.$transaction(async tx => {
    await lockPlayer(tx, userId);

    const deck = await tx.deck.findFirst({
      where: { id: deckId, userId }
    });

    if (!deck) {
      throw new DeckError(404, "Deck not found");
    }

    await validateCharacters(tx, userId, characterIds);

    await tx.deckCharacter.deleteMany({
      where: { deckId }
    });

    return tx.deck.update({
      where: { id: deckId },
      data: {
        name,
        characters: {
          create: characterIds.map((characterId, position) => ({
            characterId,
            position
          }))
        }
      },
      include: deckInclude
    });
  });
}

export function activateDeck(
  userId: string,
  deckId: string
) {
  return prisma.$transaction(async tx => {
    await lockPlayer(tx, userId);

    const deck = await tx.deck.findFirst({
      where: { id: deckId, userId },
      include: { characters: true }
    });

    if (!deck) {
      throw new DeckError(404, "Deck not found");
    }

    await validateCharacters(
      tx,
      userId,
      deck.characters.map(c => c.characterId)
    );

    await tx.deck.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    });

    return tx.deck.update({
      where: { id: deckId },
      data: { isActive: true },
      include: deckInclude
    });
  });
}

export function deleteDeck(
  userId: string,
  deckId: string
) {
  return prisma.$transaction(async tx => {
    await lockPlayer(tx, userId);

    const deck = await tx.deck.findFirst({
      where: { id: deckId, userId }
    });

    if (!deck) {
      throw new DeckError(404, "Deck not found");
    }

    await tx.deck.delete({
      where: { id: deckId }
    });

    if (deck.isActive) {
      const replacement = await tx.deck.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" }
      });

      if (replacement) {
        await tx.deck.update({
          where: { id: replacement.id },
          data: { isActive: true }
        });
      }
    }
  });
}
