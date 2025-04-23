import * as express from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { ExpressAuth, getSession, User } from '@auth/express';
import { authConfig, prisma } from '../utils/config.auth';
import { SessionController } from '../utils/sessionController';
import { ConnectResult } from 'puppeteer-real-browser';
import { connect } from 'puppeteer-real-browser';
import { DefaultPuppeteerOptions } from '../utils/pupp';
import { HTTPResponse } from 'rebrowser-puppeteer-core';
import { Page } from "rebrowser-puppeteer-core"
import { randomUUID } from 'crypto';
import { read } from 'fs';
import { GetUser } from '../utils/session';

export const browserRouter = express.Router();









async function GetRequest(req: express.Request, res: express.Response) {
    const user = await GetUser(req);
    if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    const body = req.body;
    var browser: ConnectResult;
    if (body.session_id.length > 0) {
        var [Browsersession, dbSession] = await SessionController.GetSession(user as any, body.session_id);
        if (!Browsersession) {
            return res.status(404).json({ message: 'Session not found' });
        }
        browser = Browsersession;
    } else {
        browser = await connect(DefaultPuppeteerOptions())
    }
    if (!browser) {
        return res.status(500).json({ message: 'Failed to connect to browser' });
    }
    try {
        var url = new URL(body.url);
    } catch (error) {
        return res.status(400).json({ message: 'Invalid URL' });
    }
    if (!body.url.startsWith("http")) {
        return res.status(400).json({ message: 'Invalid URL' });
    }
    if (body.url.length < 5) {
        return res.status(400).json({ message: 'Invalid URL' });
    }
    const actions = body.actions;
    if (!Array.isArray(actions)) {
        return res.status(400).json({ message: 'Invalid actions' });
    }
    if (actions.length > 10) {
        return res.status(400).json({ message: 'Too many actions' });
    }

    const page = await browser.browser.newPage();
    await page.setViewport(null);

    const setcookies = body.cookies;
    if (setcookies) {
        for (const cookie of setcookies) {
            if (!cookie.name || !cookie.value) {
                return res.status(400).json({ message: 'Invalid cookie' });
            }
            await browser.browser.setCookie(cookie);
        }
    }
    page.goto(body.url, { waitUntil: "networkidle0" });
    const response: Error | HTTPResponse = await new Promise((resolve, reject) => {
        var timeout = setTimeout(() => {
            resolve(new Error("Timeout"))
        }, 10_000)
        page.on('response', (response) => {
            const resourceType = response.request().resourceType()
            const code = response.status()
            const url = response.url()
            if (code == 200 && resourceType == "document") {
                clearTimeout(timeout)
                timeout = setTimeout(() => {
                    resolve(response)
                }, 6000)
            }
        })
    })
    if (response instanceof Error) {
        return res.status(500).json({ message: response.message });
    }
    try {
        console.log("Actions: ", actions)
        for (const action of actions) {
            if (!("type" in action)) {
                throw new Error(`Invalid action type`);
            }
            const actionType = action.type;
            console.log(actionType)
            switch (actionType) {
                case "reload":
                    await page.reload({ waitUntil: "networkidle0" });
                    break;
                case "wait":
                    const time = isNaN(parseInt(action.time)) ? 0 : parseInt(action.time);
                    if (time <= 0) {
                        throw new Error(`Invalid wait time`);
                    }
                    await timeout(action.time);
                    break;
                case "click":
                    if (!("selector" in action)) {
                        throw new Error(`Invalid action selector`);
                    }
                    const selector = action.selector;
                    await page.click(selector);
                    break;
                case "waitForSelector":
                    if (!("selector" in action)) {
                        throw new Error(`Invalid action selector`);
                    }
                    const waitSelector = action.selector;
                    await page.waitForSelector(waitSelector, { visible: true, timeout: 10000 });
                    break;
                case "type":
                    if (!("selector" in action) || !("text" in action)) {
                        throw new Error(`Invalid action selector`);
                    }
                    const typeSelector = action.selector;
                    const text = action.text;
                    await page.type(typeSelector, text, { delay: 100 });
                    break;
                case "evaluate":
                    if (!("function" in action)) {
                        throw new Error(`Invalid action selector`);
                    }
                    const func = action.function;
                    await page.evaluate(func)
                    break;

                default:
                    throw new Error(`Invalid action type`);
            }

        }
    } catch (error: unknown) {
        await page.close();
        if (body.session_id.length == 0) {
            await browser.browser.close();
        }
        return res.status(500).json({ message: `Failed to execute actions : ${error}` });
    }
    const uuid = randomUUID()
    const status = response.status()
    const headers = response.headers()
    const cookies = await browser.browser.cookies()
    const content = await page.content()
    const userAgent = await page.evaluate(() => navigator.userAgent)
    const title = await page.title()
    await page.screenshot({ path: process.env.SCREENSHOT_PATH + `${uuid}.png` });

    await page.close();
    if (body.session_id.length == 0) {
        await browser.browser.close();
    }

    // Log the request in the database
    try {
        await prisma.requestLog.create({
            data: {
                userId: user.id,
                url: body.url,
                method: "GET",
                status: status,
                actions: JSON.stringify(body.actions),
                sessionId: body.session_id || null,
            }
        });
    } catch (e) {
        console.error("Failed to log browser request:", e);
    }

    res.status(200).json({
        status: status,
        headers: headers,
        cookies: cookies,
        title: title,
        userAgent: userAgent,
        content: content,
        screenshot: `/screenshot/${uuid}`,
    });


}


async function BrowserDownloadFile(req: express.Request, res: express.Response) {
    const user = await GetUser(req);
    if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // Support both GET (query) and POST (body) for url/session_id
    let url: string, session_id: string;
    if (req.method === "POST") {
        url = req.body.url;
        session_id = req.body.session_id;
    } else {
        url = req.query.url as string;
        session_id = req.query.session_id as string;
    }

    try {
        new URL(url);
    } catch (error) {
        return res.status(400).json({ message: 'Invalid URL' });
    }
    if (!url.startsWith("http")) {
        return res.status(400).json({ message: 'Invalid URL' });
    }

    // get session from db
    const [Browsersession, dbSession] = await SessionController.GetSession(user as any, session_id);
    if (!Browsersession) {
        return res.status(404).json({ message: 'Session not found' });
    }
    const cookies = await Browsersession.browser.cookies();
    const cookiesAsString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    const headers = {
        'User-Agent': await Browsersession.browser.userAgent(),
        'Cookie': cookiesAsString,
    };

    try {
        const fetchReq = await fetch(url, {
            method: 'GET',
            headers: headers,
            redirect: 'follow',
        });
        if (!fetchReq.ok) {
            console.error(`Failed to fetch file: ${fetchReq.status} ${fetchReq.statusText}`);
            return res.status(fetchReq.status).json({ message: 'Failed to download file' });
        }
        const contentType = fetchReq.headers.get('content-type') || 'application/octet-stream';
        const contentDisposition = fetchReq.headers.get('content-disposition') || 'attachment; filename="downloaded_file"';
        const filename = contentDisposition.split('filename=')[1]?.replace(/['"]/g, '') || 'downloaded_file';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', fetchReq.headers.get('content-length') || '0');

        // Stream the response body to the client
        if (fetchReq.body) {
            const reader = fetchReq.body.getReader();
            res.status(200);
            const pump = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value);
                }
                res.end();
            };
            pump().catch(err => {
                reader.releaseLock();
                res.status(500).json({ message: 'Failed to stream response' });
            });
        } else {
            res.status(500).json({ message: 'Failed to read response stream' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Proxy download failed', error: error?.toString() });
    }
}

export const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
browserRouter.post("/get", GetRequest);
browserRouter.get("/download", BrowserDownloadFile);
browserRouter.post("/download", BrowserDownloadFile); // Ajoute POST pour proxy download










