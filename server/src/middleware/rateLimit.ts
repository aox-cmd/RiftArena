import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 180,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many requests. Try again shortly."
  }
});
