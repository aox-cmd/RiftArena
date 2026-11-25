import { Router } from "express";
import { prisma } from "../config/database.js";
import { getAbilities } from "../game/abilities/catalog.js";
import {
  requireAuth,
  type AuthRequest
} from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const characters = await prisma.character.findMany({
      orderBy: { name: "asc" }
    });

    res.json(characters.map(character => ({
      ...character,
      abilities: getAbilities(character.id)
    })));
  } catch {
    res.status(500).json({
      message: "Unable to load characters"
    });
  }
});

router.get("/owned", requireAuth, async (req: AuthRequest, res) => {
  try {
    const owned = await prisma.playerCharacter.findMany({
      where: { userId: req.userId! },
      include: { character: true }
    });

    res.json(owned.map(entry => ({
      ...entry.character,
      unlockedAt: entry.unlockedAt,
      abilities: getAbilities(entry.characterId)
    })));
  } catch {
    res.status(500).json({
      message: "Unable to load collection"
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id }
    });

    if (!character) {
      res.status(404).json({
        message: "Character not found"
      });
      return;
    }

    res.json({
      ...character,
      abilities: getAbilities(character.id)
    });
  } catch {
    res.status(500).json({
      message: "Unable to load character"
    });
  }
});

export default router;
