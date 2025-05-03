import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@auth/express';
import { authenticatedUser } from '../utils/session';
import { authConfig, prisma } from '../utils/config.auth';
import { generateToken } from '../utils/tokenAuth';

const router = express.Router();

router.get('/profile', authenticatedUser, async (req: Request, res: Response) => {
  try {
    const session = await getSession(req, authConfig);
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', authenticatedUser, async (req, res) => {
  try {
    const session = await getSession(req, authConfig);
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const { name, DeepSeekApiKey, ChatgptApiKey } = req.body;
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name,
        DeepSeekApiKey: DeepSeekApiKey || null,
        ChatgptApiKey: ChatgptApiKey || null
      },
      select: {
        id: true,
        email: true,
        name: true,
        DeepSeekApiKey: true,
        ChatgptApiKey: true,
        updatedAt: true,
      },
    });
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint pour générer un nouveau token API
router.post('/tokens', authenticatedUser, async (req, res) => {
  try {
    const session = await getSession(req, authConfig);
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { name, expiresIn } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Token name is required' });
    }

    // Calculer la date d'expiration si expiresIn est fourni (en jours)
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
    }

    const token = generateToken();
    const authToken = await prisma.authToken.create({
      data: {
        name,
        token,
        expiresAt,
        user: {
          connect: { email: session.user.email }
        }
      }
    });

    // Ne renvoyer le token complet qu'une seule fois lors de la création
    res.status(201).json({
      id: authToken.id,
      name: authToken.name,
      token: authToken.token,
      createdAt: authToken.createdAt,
      expiresAt: authToken.expiresAt
    });
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lister les tokens de l'utilisateur
router.get('/tokens', authenticatedUser, async (req, res) => {
  try {
    const session = await getSession(req, authConfig);
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const tokens = await prisma.authToken.findMany({
      where: {
        user: { email: session.user.email }
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true
      }
    });

    res.json(tokens);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Supprimer un token
router.delete('/tokens/:id', authenticatedUser, async (req, res) => {
  try {
    const session = await getSession(req, authConfig);
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { id } = req.params;

    // Vérifier que le token appartient à l'utilisateur
    const token = await prisma.authToken.findFirst({
      where: {
        id,
        user: { email: session.user.email }
      }
    });

    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    await prisma.authToken.delete({
      where: { id }
    });

    res.json({ message: 'Token deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export { router };
