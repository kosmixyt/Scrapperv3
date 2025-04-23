import { NextFunction, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { prisma } from './config.auth';

// Génère un token unique
export const generateToken = (): string => {
    return randomBytes(32).toString('hex');
};

// Middleware pour vérifier l'authentification par token
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

    if (!token) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    try {
        const authToken = await prisma.authToken.findFirst({
            where: {
                token: token,
            },
            include: {
                user: true,
            },
        });

        if (!authToken) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        // Attach the user to the request
        req.user = authToken.user;
        next();
    } catch (error) {
        return res.status(500).json({ message: 'Server error during authentication' });
    }
};
