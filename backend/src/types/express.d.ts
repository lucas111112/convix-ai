import { UserRole, Plan } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        workspaceId?: string;
      };
      workspace?: {
        id: string;
        name: string;
        slug: string;
        plan: Plan;
      };
    }
  }
}

export {};
