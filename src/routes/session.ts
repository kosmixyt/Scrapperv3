import * as express from "express";
import { SessionController } from "../utils/sessionController";
import { getSession } from "@auth/express";
import { authConfig } from "../utils/config.auth";
import { User } from "@prisma/client";
import { GetUser } from "../utils/session";
import { DefaultPuppeteerOptions } from "../utils/pupp";
export const sessionRouter = express.Router();

async function SessionCreate(req: express.Request, res: express.Response) {
  const user = await GetUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const [browserSess, _] = await SessionController.CreateSession(
    user as User,
    DefaultPuppeteerOptions()
  );
  if (!browserSess) {
    return res.status(500).json({ error: "Failed to create session" });
  }
  res.status(200).json({ message: "Session created", session: browserSess.id });
}
async function SessionDelete(req: express.Request, res: express.Response) {
  const user = await GetUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    await SessionController.DeleteSession(user as User);
    return res.status(200).json({ message: "Session deleted" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete session" });
  }
}
async function SessionList(req: express.Request, res: express.Response) {
  const user = await GetUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const sessions = await SessionController.ListSessions(user as User);
    if (!sessions) {
      return res.status(404).json({ error: "No sessions found" });
    }
    return res.status(200).json(sessions.map((session) => session.id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list sessions" });
  }
}
sessionRouter.get("/list", SessionList);
sessionRouter.delete("/delete", SessionDelete);
sessionRouter.post("/create", SessionCreate);
