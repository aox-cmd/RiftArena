import { Router, type Response } from "express";
import { z } from "zod";

import {
  requireAuth,
  type AuthRequest
} from "../middleware/auth.js";

import {
  DeckError,
  getDecks,
  createDeck,
  updateDeck,
  activateDeck,
  deleteDeck
} from "../services/deck.service.js";

const router = Router();

router.use(requireAuth);

const deckSchema = z.object({
  name: z.string().trim().min(1).max(40),
  characterIds: z.array(
    z.string().min(1).max(191)
  ).length(3)
}).refine(
  data => new Set(data.characterIds).size === 3,
  { message: "Duplicate characters are not allowed" }
);

function handleError(error: unknown, res: Response) {
  if (error instanceof DeckError) {
    res.status(error.status).json({
      message: error.message
    });
    return;
  }

  console.error("Deck error:", error);

  res.status(500).json({
    message: "Deck operation failed"
  });
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    res.json(await getDecks(req.userId!));
  } catch (error) {
    handleError(error, res);
  }
});

router.post("/", async (req: AuthRequest, res) => {
  const parsed = deckSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid deck",
      errors: parsed.error.flatten()
    });
    return;
  }

  try {
    const deck = await createDeck(
      req.userId!,
      parsed.data.name,
      parsed.data.characterIds
    );

    res.status(201).json(deck);
  } catch (error) {
    handleError(error, res);
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  const parsed = deckSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid deck",
      errors: parsed.error.flatten()
    });
    return;
  }

  try {
    res.json(await updateDeck(
      req.userId!,
      String(req.params.id),
      parsed.data.name,
      parsed.data.characterIds
    ));
  } catch (error) {
    handleError(error, res);
  }
});

router.patch("/:id/activate", async (req: AuthRequest, res) => {
  try {
    res.json(await activateDeck(
      req.userId!,
      String(req.params.id)
    ));
  } catch (error) {
    handleError(error, res);
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await deleteDeck(
      req.userId!,
      String(req.params.id)
    );

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

export default router;
