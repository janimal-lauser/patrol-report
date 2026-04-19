// Erweitert Express Request um den eingeloggten User
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        companyId: string;
        role: string;
        name: string | null;
      };
    }
  }
}

export {};
