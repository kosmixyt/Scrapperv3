import * as express from 'express';
import { BrowserSession, PrismaClient, User } from '@prisma/client';
import dotenv from 'dotenv';
import { ExpressAuth, getSession } from '@auth/express';
import { connect, ConnectResult, Options } from "puppeteer-real-browser"
import { prisma } from './config.auth';



class sessionController {
    private static sessions: Map<string, ConnectResult> = new Map<string, ConnectResult>();
    constructor() {
        setInterval(this.CheckDbSync, 1000)
    }
    public async CreateSession(user: User, options: Options): Promise<[BrowserSession, ConnectResult]> {
        const { page, browser } = await connect(options);
        try {
            var session = await prisma.browserSession.create({
                data: {
                    userId: user.id,
                }
            });
        } catch (error) {
            console.error('Error creating session in database:', error);
            await browser.close();
            throw new Error('Failed to create session in database');
        }
        sessionController.sessions.set(session.id, { page, browser });
        return [session, { page, browser }];
    }
    public async GetSession(user: User, session_id: string): Promise<[ConnectResult, BrowserSession] | [null, null]> {
        const session = await prisma.browserSession.findFirst({
            where: {
                userId: user.id,
                AND: {
                    id: session_id,
                }
            }
        });
        if (!session) return [null, null];
        const connectResult = sessionController.sessions.get(session.id);
        if (!connectResult) return [null, null];
        return [connectResult, session];
    }
    public async DeleteSession(user: User): Promise<void> {
        const session = await prisma.browserSession.findFirst({
            where: {
                userId: user.id,
            }
        });
        if (!session) return;
        const connectResult = sessionController.sessions.get(session.id);
        if (connectResult) {
            await connectResult.browser.close();
            sessionController.sessions.delete(session.id);
        } else {
            throw new Error('Session not found in memory');
        }
        await prisma.browserSession.delete({
            where: {
                id: session.id,
            }
        });
    }
    public async CheckDbSync(): Promise<void> {
        const dbSessions = await prisma.browserSession.findMany();
        const memorySessions = Array.from(sessionController.sessions.keys());

        for (const session of dbSessions) {
            if (!memorySessions.includes(session.id)) {
                throw new Error(`Session ${session.id} not found in memory`);
            }
        }

    }
    public async ListSessions(user: User): Promise<BrowserSession[]> {
        const sessions = await prisma.browserSession.findMany({
            where: {
                userId: user.id,
            }
        });
        return sessions;
    }
}


export const SessionController = new sessionController();