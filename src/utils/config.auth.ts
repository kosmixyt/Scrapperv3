import { ExpressAuthConfig } from "@auth/express";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient, User } from "@prisma/client";
import DiscordProvider from "next-auth/providers/discord";
export const prisma = new PrismaClient();

export const authConfig: ExpressAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // @ts-ignore
    DiscordProvider.default({
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,

    })
  ],
  trustHost: true,
  callbacks: {
    //@ts-ignore
    session: ({ session, user }) => {
      if (session.user) {
        // @ts-ignore
        session.user = user as User;
      }
      return session;
    },
  },
};
// for build
// DiscordProvider.default
// for dev
// DiscordProvider