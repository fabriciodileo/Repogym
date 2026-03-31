import type { AuthenticatedSession } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedSession;
    }
  }
}

export {};
