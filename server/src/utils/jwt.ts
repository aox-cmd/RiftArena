import "dotenv/config";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
  throw new Error("A secure JWT_SECRET is required");
}

const JWT_SECRET: string = secret;

export function createToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "7d",
      issuer: "riftarena"
    }
  );
}

export function verifyToken(token: string): string {
  const payload = jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: "riftarena"
  });

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string"
  ) {
    throw new Error("Invalid token");
  }

  return payload.sub;
}
