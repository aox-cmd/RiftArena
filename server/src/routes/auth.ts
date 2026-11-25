import { Router } from "express";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import rateLimit from "express-rate-limit";

import { prisma } from "../config/database.js";
import { createToken } from "../utils/jwt.js";
import {
  requireAuth,
  type AuthRequest
} from "../middleware/auth.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many attempts. Try again later."
  }
});

const publicUser = {
  id: true,
  username: true,
  email: true,
  rating: true,
  wins: true,
  losses: true,
  createdAt: true
} as const;

const passwordSchema = z.string()
  .min(8)
  .max(72)
  .refine(
    value => Buffer.byteLength(value, "utf8") <= 72,
    "Password is too long"
  );

const registerSchema = z.object({
  username: z.string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.string()
    .trim()
    .email()
    .max(191)
    .transform(value => value.toLowerCase()),
  password: passwordSchema
});

const loginSchema = registerSchema.pick({
  email: true,
  password: true
});

const dummyHash = bcrypt.hashSync(
  "riftarena-dummy-password",
  12
);

router.post("/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid registration information",
      errors: parsed.error.flatten()
    });
    return;
  }

  const { username, email, password } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async tx => {
      const account = await tx.user.create({
        data: { username, email, passwordHash },
        select: publicUser
      });

      const starters = await tx.character.findMany({
        where: { isStarter: true },
        select: { id: true }
      });

      if (starters.length) {
        await tx.playerCharacter.createMany({
          data: starters.map(character => ({
            userId: account.id,
            characterId: character.id
          }))
        });
      }

      return account;
    });

    res.status(201).json({
      token: createToken(user.id),
      user
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        message: "Username or email already exists"
      });
      return;
    }

    console.error("Registration failed:", error);
    res.status(500).json({
      message: "Registration failed"
    });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid login information"
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: {
        ...publicUser,
        passwordHash: true
      }
    });

    const valid = await bcrypt.compare(
      parsed.data.password,
      user?.passwordHash || dummyHash
    );

    if (!user || !valid) {
      res.status(401).json({
        message: "Invalid email or password"
      });
      return;
    }

    const { passwordHash, ...safeUser } = user;

    res.json({
      token: createToken(user.id),
      user: safeUser
    });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({
      message: "Login failed"
    });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: publicUser
    });

    if (!user) {
      res.status(401).json({
        message: "Account not found"
      });
      return;
    }

    res.json(user);
  } catch {
    res.status(500).json({
      message: "Unable to load account"
    });
  }
});

export default router;
