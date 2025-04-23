import { getSession } from "@auth/express";
import express, { NextFunction } from "express";
import { authConfig } from "./config.auth";
import { Prisma, User } from "@prisma/client";
export async function authenticatedUser(
  req: express.Request,
  res: express.Response,
  next: NextFunction
) {
  const session = res.locals.session ?? (await getSession(req, authConfig));
  if (!session?.user) {
    res.status(401).json({ message: "Authentication required" });
  } else {
    next();
  }
}


export async function GetUser(req: express.Request): Promise<User | null> {
  //@ts-ignore
  if (req.user) {
    // @ts-ignore
    return req.user as User;
  }
  const session = await getSession(req, authConfig);
  if (!session?.user) {
    return null;
  } else {
    return session.user as User;
  }

}