import { Request, Response, NextFunction } from 'express';
import { db, verifyPin, generateToken, logAuditAction } from './db.js';

export interface AuthSession {
  token: string;
  userId: string;
  username: string;
  role: 'ADMIN' | 'MEMBER';
  memberId?: string;
  fullName?: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.cookies?.auth_token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No session token provided.' });
  }

  const now = Date.now();
  const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?').get(token, now) as any;
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  let fullName = session.username;
  if (session.role === 'MEMBER' && session.member_id) {
    const member = db.prepare('SELECT full_name, account_status FROM members WHERE id = ?').get(session.member_id) as any;
    if (member) {
      if (member.account_status !== 'ACTIVE') {
        return res.status(403).json({ error: 'Your member account is currently inactive or suspended. Contact administration.' });
      }
      fullName = member.full_name;
    }
  }

  (req as any).user = {
    token: session.token,
    userId: session.user_id,
    username: session.username,
    role: session.role,
    memberId: session.member_id,
    fullName
  };

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Administrative privileges required.' });
  }
  next();
}

export function requireMember(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'MEMBER') {
    return res.status(403).json({ error: 'Member account required.' });
  }
  next();
}
