import * as express from 'express';
import { SessionController } from '../utils/sessionController';
import { getSession } from '@auth/express';
import { authConfig } from '../utils/config.auth';
import { User } from '@prisma/client';
import { GetUser } from '../utils/session';
export const sessionRouter = express.Router();







async function SessionCreate(req: express.Request, res: express.Response) {
    const user = await GetUser(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const [browserSess, _] = await SessionController.CreateSession(user as User, {})
    if (!browserSess) {
        return res.status(500).json({ error: 'Failed to create session' });
    }
    res.status(200).json({ message: 'Session created', session: browserSess.id });
}
async function SessionDelete(req: express.Request, res: express.Response) {
    const user = await GetUser(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    await SessionController.DeleteSession(user as User)
    res.status(200).json({ message: 'Session deleted' });
}
async function SessionList(req: express.Request, res: express.Response) {
    const user = await GetUser(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const sessions = await SessionController.ListSessions(user as User)
    if (!sessions) {
        return res.status(404).json({ error: 'No sessions found' });
    }
    res.status(200).json(sessions.map((session) => session.id));
}
sessionRouter.get('/list', SessionList);
sessionRouter.delete('/delete', SessionDelete);
sessionRouter.post('/create', SessionCreate);
