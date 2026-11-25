import type {
  Request,
  Response,
  NextFunction
} from "express";

import { verifyToken } from "../utils/jwt.js";

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Authentication required"
    });
    return;
  }

  try {
    req.userId = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}
