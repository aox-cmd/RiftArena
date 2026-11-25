import { pinoHttp } from "pino-http";
import { logger } from "./config/logger.js";

import { apiLimiter } from "./middleware/rateLimit.js";
import rankingRouter from "./routes/ranking.js";
import { MultiplayerManager } from "./game/matchmaking/manager.js";
import { registerMultiplayerEvents } from "./sockets/multiplayer.js";
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createServer } from "node:http";
import { Server } from "socket.io";

import { prisma } from "./config/database.js";
import authRouter from "./routes/auth.js";
import deckRouter from "./routes/decks.js";
import characterRouter from "./routes/characters.js";
import { verifyToken } from "./utils/jwt.js";

const app = express();
const httpServer = createServer(app);

const PORT = Number(process.env.PORT || 4000);
const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

app.use(helmet());
app.use(compression());

app.use(cors({
  origin: CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
}));

app.use(express.json({ limit: "100kb" }));

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  },
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 100000
});

app.use(pinoHttp({ logger }));
app.use("/api", apiLimiter);
app.use("/api/auth", authRouter);
app.use("/api/ranking", rankingRouter);
app.use("/api/decks", deckRouter);
app.use("/api/characters", characterRouter);

app.get("/", (_req, res) => {
  res.json({
    name: "RiftArena API",
    version: "1.0.0",
    status: "online"
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "healthy",
      database: "connected",
      connectedClients: io.engine.clientsCount,
      uptime: Math.floor(process.uptime())
    });
  } catch {
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected"
    });
  }
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (typeof token !== "string") {
      return next(new Error("Authentication required"));
    }

    const userId = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        rating: true
      }
    });

    if (!user) {
      return next(new Error("Account not found"));
    }

    socket.data.user = user;
    next();
  } catch {
    next(new Error("Invalid authentication"));
  }
});

const multiplayer = new MultiplayerManager(io);

io.on("connection", (socket) => {
  const user = socket.data.user;

  socket.join(`user:${user.id}`);

  registerMultiplayerEvents(socket, multiplayer);

  console.log(`Player connected: ${user.username}`);

  socket.emit("server:welcome", {
    message: "Welcome to RiftArena",
    user
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${user.username}`);
  });
});

async function start() {
  await prisma.$connect();

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log("--------------------------------");
    console.log("RIFTARENA SERVER IS ONLINE");
    console.log("MySQL: CONNECTED");
    console.log("Authentication: READY");
    console.log("Socket.IO: SECURED");
    console.log(`API: http://localhost:${PORT}`);
    console.log("--------------------------------");
  });
}

start().catch(error => {
  console.error("Startup failed:", error);
  process.exit(1);
});







