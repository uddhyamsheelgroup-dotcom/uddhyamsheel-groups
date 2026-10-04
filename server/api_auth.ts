import { Router, Request, Response } from 'express';
import { db, verifyPin, hashPin, generateToken, logAuditAction } from './db.js';
import { authMiddleware, requireAdmin } from './auth.js';

export const authRouter = Router();

// In-memory rate limiting and brute force protection
interface AttemptRecord {
  count: number;
  lockedUntil: number;
}
const loginAttempts = new Map<string, AttemptRecord>();

// Helper to record failed attempt and check locks
function checkRateLimit(key: string): { isLocked: boolean; waitMinutes: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (record && record.lockedUntil > now) {
    const waitMinutes = Math.ceil((record.lockedUntil - now) / (60 * 1000));
    return { isLocked: true, waitMinutes };
  }
  return { isLocked: false, waitMinutes: 0 };
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  // If 5 or more failed attempts, lock for 15 minutes
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000;
  }
  loginAttempts.set(key, record);
}

function clearFailedAttempts(key: string) {
  loginAttempts.delete(key);
}

import { validateServerNumericPin } from './pinValidation.js';

// Login (supports both ADMIN and MEMBER with rate limiting & session fixation protection)
authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { identifier, pin, role } = req.body;
    if (!identifier || !pin) {
      return res.status(400).json({ error: 'Identification and PIN are required.' });
    }

    const cleanId = String(identifier).trim();
    const cleanPin = String(pin).trim();
    const ip = String(req.ip || req.socket.remoteAddress || '127.0.0.1');

    // Strict PIN validation: Member = 6 digits, Admin = 4 digits
    const expectedLength = role === 'MEMBER' ? 6 : 4;
    const pinCheck = validateServerNumericPin(cleanPin, expectedLength, role === 'MEMBER' ? 'Member PIN' : 'Admin PIN');
    if (!pinCheck.valid) {
      return res.status(400).json({ error: pinCheck.error });
    }

    // Rate limit check by IP and identifier
    const ipLock = checkRateLimit(`ip:${ip}`);
    if (ipLock.isLocked) {
      return res.status(429).json({
        error: `Too many failed login attempts from this network. Please wait ${ipLock.waitMinutes} minute(s) before trying again.`
      });
    }

    const idLock = checkRateLimit(`id:${cleanId.toLowerCase()}`);
    if (idLock.isLocked) {
      return res.status(429).json({
        error: `Account temporarily locked due to multiple failed login attempts. Please wait ${idLock.waitMinutes} minute(s) before trying again.`
      });
    }

    // Clean up expired sessions periodically
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());

    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 3600 * 1000,
      path: '/'
    };

    if (role === 'ADMIN' || !role) {
      const admin = db.prepare("SELECT * FROM admins WHERE LOWER(username) = LOWER(?) OR (LOWER(?) = 'udgadmin' AND LOWER(username) = 'admin')").get(cleanId, cleanId) as any;
      if (admin && verifyPin(cleanPin, admin.pin_hash, admin.salt)) {
        clearFailedAttempts(`ip:${ip}`);
        clearFailedAttempts(`id:${cleanId.toLowerCase()}`);

        const token = generateToken();
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
        db.prepare(`
          INSERT INTO sessions (token, user_id, username, role, member_id, expires_at, created_at)
          VALUES (?, ?, ?, 'ADMIN', NULL, ?, ?)
        `).run(token, admin.id, admin.username, expiresAt, new Date().toISOString());

        logAuditAction(admin.id, admin.username, 'ADMIN', 'LOGIN', 'ADMIN', admin.id, 'Administrator authenticated successfully', ip);

        res.cookie('auth_token', token, cookieOptions);
        return res.json({
          token,
          user: {
            userId: admin.id,
            username: admin.username,
            role: 'ADMIN',
            fullName: 'Organization Administrator'
          }
        });
      }
    }

    // Check Member login
    const member = db.prepare('SELECT * FROM members WHERE UPPER(id) = UPPER(?) OR LOWER(mobile_phone) = LOWER(?)').get(cleanId, cleanId) as any;
    if (member) {
      if (member.account_status !== 'ACTIVE' || member.membership_status !== 'ACTIVE') {
        recordFailedAttempt(`ip:${ip}`);
        recordFailedAttempt(`id:${cleanId.toLowerCase()}`);
        return res.status(403).json({
          error: 'Your member account is currently inactive or pending administrative approval. Please contact administration.'
        });
      }

      if (verifyPin(cleanPin, member.pin_hash, member.salt)) {
        clearFailedAttempts(`ip:${ip}`);
        clearFailedAttempts(`id:${cleanId.toLowerCase()}`);

        const token = generateToken();
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
        db.prepare(`
          INSERT INTO sessions (token, user_id, username, role, member_id, expires_at, created_at)
          VALUES (?, ?, ?, 'MEMBER', ?, ?, ?)
        `).run(token, member.id, member.full_name, member.id, expiresAt, new Date().toISOString());

        logAuditAction(member.id, member.full_name, 'MEMBER', 'LOGIN', 'MEMBER', member.id, `Member ${member.id} authenticated`, ip);

        res.cookie('auth_token', token, cookieOptions);
        return res.json({
          token,
          user: {
            userId: member.id,
            username: member.id,
            role: 'MEMBER',
            memberId: member.id,
            fullName: member.full_name,
            membershipDate: member.membership_date
          }
        });
      }
    }

    // Record failure for brute-force protection
    recordFailedAttempt(`ip:${ip}`);
    recordFailedAttempt(`id:${cleanId.toLowerCase()}`);
    logAuditAction('UNKNOWN', cleanId, 'SYSTEM', 'LOGIN_FAILED', 'AUTH', null, `Failed authentication attempt for identifier "${cleanId}"`, ip);

    // Generic error message: do not reveal whether account exists
    return res.status(401).json({ error: 'Invalid credentials. Please verify your identification and PIN.' });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// Current User Profile / Session Check
authRouter.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ user });
});

// Logout
authRouter.post('/logout', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(user.token);
  logAuditAction(user.userId, user.username, user.role, 'LOGOUT', 'SESSION', user.token, `${user.role} logged out`);
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Admin change credentials
authRouter.post('/change-admin-credentials', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { currentPin, newUsername, newPin } = req.body;

    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(user.userId) as any;
    if (!admin || !verifyPin(String(currentPin), admin.pin_hash, admin.salt)) {
      return res.status(401).json({ error: 'Current PIN is incorrect.' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (newUsername && newUsername.trim() !== admin.username) {
      const existing = db.prepare('SELECT id FROM admins WHERE LOWER(username) = LOWER(?) AND id != ?').get(newUsername.trim(), admin.id);
      if (existing) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
      updates.push('username = ?');
      params.push(newUsername.trim());
    }

    if (newPin && newPin.trim()) {
      if (newPin.trim().length < 4) {
        return res.status(400).json({ error: 'New PIN must be at least 4 digits.' });
      }
      const { hash, salt } = hashPin(newPin.trim());
      updates.push('pin_hash = ?', 'salt = ?');
      params.push(hash, salt);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No changes provided.' });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(admin.id);

    db.prepare(`UPDATE admins SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    logAuditAction(admin.id, newUsername || admin.username, 'ADMIN', 'CREDENTIALS_CHANGED', 'ADMIN', admin.id, 'Administrator updated credentials');

    res.json({ success: true, message: 'Administrator credentials updated successfully.' });
  } catch (err: any) {
    console.error('Change admin credentials error:', err);
    res.status(500).json({ error: 'Failed to update credentials.' });
  }
});

// Member change PIN
authRouter.post('/change-member-pin', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'MEMBER' || !user.memberId) {
      return res.status(403).json({ error: 'Only members can use this endpoint.' });
    }

    const { currentPin, newPin } = req.body;
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(user.memberId) as any;
    if (!member || !verifyPin(String(currentPin), member.pin_hash, member.salt)) {
      return res.status(401).json({ error: 'Current PIN is incorrect.' });
    }

    const val = validateServerNumericPin(newPin, 6, 'New PIN', true);
    if (!val.valid) {
      return res.status(400).json({ error: val.error });
    }

    const { hash, salt } = hashPin(String(newPin).trim());
    db.prepare('UPDATE members SET pin_hash = ?, salt = ?, updated_at = ? WHERE id = ?').run(hash, salt, new Date().toISOString(), member.id);

    logAuditAction(member.id, member.full_name, 'MEMBER', 'PIN_CHANGED', 'MEMBER', member.id, 'Member updated their portal PIN');

    res.json({ success: true, message: 'Your PIN has been updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update member PIN.' });
  }
});
