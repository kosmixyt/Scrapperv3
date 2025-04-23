import { User } from "@prisma/client";
import "@auth/core";

declare module "@auth/core" {
    interface Session {
        user: User;
    }
}

// Ajouter le type pour les tokens d'authentification
export interface AuthToken {
    id: string;
    name: string;
    token: string;
    createdAt: Date;
    expiresAt?: Date | null;
    userId: string;
}
