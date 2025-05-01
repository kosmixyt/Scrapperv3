import express, { NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { router as userRoutes } from "./routes/user";
import { ExpressAuth, getSession } from "@auth/express";
import { PrismaAdapter } from "@auth/prisma-adapter";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import cookie from "cookie";
import signature from "cookie-signature";
import { authConfig, prisma } from "./utils/config.auth";
import { sessionRouter } from "./routes/session";
import { browserRouter } from "./routes/browser";
import { screenshotEndpoint } from "./routes/screenshot";
import { authenticateToken } from "./utils/tokenAuth";

dotenv.config();

const app = express();

app.set("trust proxy", 1); // ou 'trust proxy', true

// Middleware pour l'authentification par token
// Ceci va vérifier si un token est présent et authentifier l'utilisateur si c'est le cas
app.use((req, res, next) => {
  // On vérifie si l'en-tête d'autorisation est présent
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    // Si oui, on utilise l'authentification par token
    authenticateToken(req, res, next);
  } else {
    // Sinon on continue normalement
    next();
  }
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Set-Cookie, Authorization, X-Requested-With"
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/users", userRoutes);
app.use("/session", sessionRouter);
app.use("/auth/*", ExpressAuth(authConfig as any));
app.use("/browser", browserRouter);
app.get("/screenshot/:id", screenshotEndpoint);

// handle 404 error
app.use("/", express.static("static"));
app.use((req, res, next) => {
  // @ts-ignore
  res.status(404).sendFile(process.cwd() + "/static/index.html");
});
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
prisma.browserSession.deleteMany({}).then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
export const wss = new WebSocketServer({ server });

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
