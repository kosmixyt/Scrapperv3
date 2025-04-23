import { getSession } from '@auth/express';
import * as express from 'express';
import { authConfig } from '../utils/config.auth';
import path from 'path';
import fs from "fs"
import { GetUser } from '../utils/session';
export async function screenshotEndpoint(req: express.Request, res: express.Response) {
    const user = await GetUser(req);
    if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    const uuid = req.params.id;
    const exist = fs.existsSync(`${path.join(process.env.SCREENSHOT_PATH as string, uuid)}.png`)
    if (!exist) {
        return res.status(404).json({ message: 'File not found' });
    }
    res.sendFile(`${path.join(process.env.SCREENSHOT_PATH as string, uuid)}.png`, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error sending file');
        } else {
            console.log('File sent successfully');
        }
    })
}