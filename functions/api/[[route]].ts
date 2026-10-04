/**
 * Cloudflare Pages Function & Workers Gateway
 * Authoritative API Gateway for Uddhyamsheel Group Management System
 *
 * Runtime:
 * - Cloudflare Workers / Pages Functions
 * - Cloudflare D1 (Native Distributed SQL)
 * - Cloudflare Web Crypto API
 * - Zero Node.js runtime dependencies (no fs, path, Buffer, bcrypt, or process.env)
 * - Server-Authoritative Role-Based Access Control (Admin & Member isolation)
 */

export interface Env {
  DB: any;
  ENVIRONMENT?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PIN?: string;
  ASSETS?: any;
}

// ============================================================
// 1. CRYPTOGRAPHIC HELPERS (WEB CRYPTO API ONLY)
// ============================================================

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  if (!hex || hex.length % 2 !== 0) return new Uint8Array(0);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const val = Number.parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(val)) return new Uint8Array(0);
    bytes[i / 2] = val;
  }
  return bytes;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function hashPinWebCrypto(
  pin: string,
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const saltBytes: Uint8Array = existingSalt
    ? hexToBytes(existingSalt)
    : crypto.getRandomValues(new Uint8Array(16));

  if (saltBytes.length === 0) {
    throw new Error('Invalid PIN salt.');
  }

  const saltHex = existingSalt || bufferToHex(saltBytes);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return {
    hash: bufferToHex(derivedBits),
    salt: saltHex
  };
}

async function verifyPinWebCrypto(
  pin: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    const storedBytes = hexToBytes(storedHash);
    const saltBytes = hexToBytes(storedSalt);
    if (storedBytes.length === 0 || saltBytes.length === 0) return false;

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pin) as BufferSource,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // Primary: 100,000 iterations
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes as BufferSource,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const derivedBytes = new Uint8Array(derivedBits);
    if (derivedBytes.length === storedBytes.length && timingSafeEqualBytes(derivedBytes, storedBytes)) {
      return true;
    }

    // Backward compatibility: 10,000 iterations
    const legacyBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes as BufferSource,
        iterations: 10000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const legacyBytes = new Uint8Array(legacyBits);
    return legacyBytes.length === storedBytes.length && timingSafeEqualBytes(legacyBytes, storedBytes);
  } catch (err) {
    console.error('PIN verification error:', err);
    return false;
  }
}

function generateSecureToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bufferToHex(bytes);
}

// ============================================================
// 2. PIN VALIDATION (STRICT NUMERIC & LENGTH CONSTRAINTS)
// ============================================================

function validateNumericPinRange(
  pin: unknown,
  minLength: number,
  maxLength: number,
  fieldName = 'PIN'
): { valid: boolean; error?: string } {
  if (typeof pin !== 'string') {
    return { valid: false, error: `${fieldName} must be a valid text string.` };
  }
  if (/\s/.test(pin)) {
    return { valid: false, error: `${fieldName} must not contain spaces.` };
  }
  if (!/^[0-9]+$/.test(pin)) {
    return { valid: false, error: `${fieldName} must contain only numeric digits (0-9).` };
  }
  if (pin.length < minLength || pin.length > maxLength) {
    return {
      valid: false,
      error: minLength === maxLength
        ? `${fieldName} must contain exactly ${minLength} digits.`
        : `${fieldName} must contain between ${minLength} and ${maxLength} digits.`
    };
  }
  return { valid: true };
}

function validateMemberPin(pin: unknown): { valid: boolean; error?: string } {
  return validateNumericPinRange(pin, 6, 6, 'Member PIN');
}

function validateAdminPin(pin: unknown): { valid: boolean; error?: string } {
  return validateNumericPinRange(pin, 6, 8, 'Admin PIN');
}

// ============================================================
// 3. HTTP, COOKIE & IP HELPERS
// ============================================================

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  const cookies = header.split(';');
  for (const c of cookies) {
    const idx = c.indexOf('=');
    if (idx === -1) continue;
    const k = c.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(c.slice(idx + 1).trim());
  }
  return null;
}

function setCookieHeader(name: string, value: string, isProd: boolean, maxAgeSeconds = 86400 * 7): string {
  const secure = isProd ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${secure}`;
}

function clearCookieHeader(name: string, isProd: boolean): string {
  const secure = isProd ? '; Secure' : '';
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      ...headers
    }
  });
}

// ============================================================
// 4. BRUTE-FORCE RATE LIMITING & AUDIT LOGGING
// ============================================================

async function checkBruteForceLock(db: any, key: string): Promise<{ locked: boolean; retryAfter?: number }> {
  try {
    const row = await db
      .prepare('SELECT attempt_count, locked_until FROM login_attempts WHERE attempt_key = ?')
      .bind(key)
      .first() as any;

    if (!row) return { locked: false };
    const now = Math.floor(Date.now() / 1000);
    if (row.locked_until > now) {
      return { locked: true, retryAfter: row.locked_until - now };
    }
    return { locked: false };
  } catch {
    return { locked: false };
  }
}

async function recordFailedLoginAttempt(db: any, key: string): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const existing = await db
      .prepare('SELECT id, attempt_count FROM login_attempts WHERE attempt_key = ?')
      .bind(key)
      .first() as any;

    if (existing) {
      const nextCount = (existing.attempt_count || 0) + 1;
      let lockedUntil = 0;
      if (nextCount >= 5) {
        lockedUntil = now + 900; // 15 minute lock after 5 attempts
      }
      await db
        .prepare('UPDATE login_attempts SET attempt_count = ?, locked_until = ?, last_attempt_at = ? WHERE id = ?')
        .bind(nextCount, lockedUntil, new Date().toISOString(), existing.id)
        .run();
    } else {
      const id = 'att-' + crypto.randomUUID();
      await db
        .prepare('INSERT INTO login_attempts (id, attempt_key, attempt_count, locked_until, last_attempt_at) VALUES (?, ?, 1, 0, ?)')
        .bind(id, key, new Date().toISOString())
        .run();
    }
  } catch (err) {
    console.error('Failed to record login attempt:', err);
  }
}

async function clearLoginAttempts(db: any, key: string): Promise<void> {
  try {
    await db.prepare('DELETE FROM login_attempts WHERE attempt_key = ?').bind(key).run();
  } catch (err) {
    console.error('Failed to clear login attempts:', err);
  }
}

async function logAudit(
  db: any,
  userId: string,
  userName: string,
  role: string,
  action: string,
  entity: string,
  entityId: string,
  description: string,
  ip: string
): Promise<void> {
  try {
    const id = 'aud-' + crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO audit_logs (id, timestamp, user_id, user_name, role, action, entity, entity_id, description, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(id, new Date().toISOString(), userId, userName, role, action, entity, entityId, description, ip)
      .run();
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// ============================================================
// 5. SESSION VERIFICATION & ADMIN INITIALIZATION
// ============================================================

export interface UserSession {
  token: string;
  user_id: string;
  username: string;
  role: 'ADMIN' | 'MEMBER';
  member_id: string | null;
}

async function getAuthenticatedUser(request: Request, db: any): Promise<UserSession | null> {
  let token = getCookie(request, 'uddhyamsheel_session');
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }
  if (!token) return null;

  try {
    const now = Math.floor(Date.now() / 1000);
    const row = await db
      .prepare(`
        SELECT token, user_id, username, role, member_id, expires_at
        FROM sessions
        WHERE token = ?
      `)
      .bind(token)
      .first() as any;

    if (!row || row.expires_at < now) {
      if (row) {
        await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
      }
      return null;
    }

    return {
      token: row.token,
      user_id: row.user_id,
      username: row.username,
      role: row.role as 'ADMIN' | 'MEMBER',
      member_id: row.member_id || null
    };
  } catch (err) {
    console.error('Session retrieval error:', err);
    return null;
  }
}

async function ensureAdminAccount(db: any, env: Env): Promise<void> {
  try {
    const adminCount = await db.prepare('SELECT COUNT(*) as count FROM admins').first() as any;
    if (adminCount && adminCount.count > 0) return;

    const username = env.ADMIN_USERNAME || 'admin';
    const rawPin = env.ADMIN_PIN || '123456';
    const { hash, salt } = await hashPinWebCrypto(rawPin);
    const now = new Date().toISOString();

    await db
      .prepare(`
        INSERT INTO admins (id, username, pin_hash, salt, created_at, updated_at)
        VALUES ('ADM-001', ?, ?, ?, ?, ?)
      `)
      .bind(username, hash, salt, now, now)
      .run();

    console.log(`[AUTH] Default administrator account provisioned: ${username}`);
  } catch (err) {
    console.error('Error ensuring admin account:', err);
  }
}

// ============================================================
// 6. MAIN API GATEWAY HANDLER
// ============================================================

export const onRequest = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const db = env.DB;
  const clientIp = getClientIp(request);
  const isProd = env.ENVIRONMENT === 'production';

  // Seed default admin if table is empty
  await ensureAdminAccount(db, env);

  // ----------------------------------------------------------
  // HEALTH CHECK
  // ----------------------------------------------------------
  if (path === '/api/health' && method === 'GET') {
    return jsonResponse({
      status: 'ok',
      application: 'Uddhyamsheel Group Management System',
      runtime: 'Cloudflare Workers / Pages Native',
      database: 'Cloudflare D1 Serverless',
      established: '2079 B.S.',
      timestamp: new Date().toISOString()
    });
  }

  // ----------------------------------------------------------
  // AUTH: LOGIN
  // ----------------------------------------------------------
  if (path === '/api/auth/login' && method === 'POST') {
    try {
      const body = await request.json() as any;
      const cleanId = String(body?.identifier || '').trim();
      const cleanPin = String(body?.pin || '').trim();
      const role = String(body?.role || '').toUpperCase();

      if (!cleanId || !cleanPin) {
        return jsonResponse({ error: 'Identification and PIN are required.' }, 400);
      }

      const pinValidation = role === 'MEMBER'
        ? validateMemberPin(cleanPin)
        : validateAdminPin(cleanPin);

      if (!pinValidation.valid) {
        return jsonResponse({ error: pinValidation.error }, 400);
      }

      const lockKey = `ip:${clientIp}:id:${cleanId}`;
      const lockStatus = await checkBruteForceLock(db, lockKey);
      if (lockStatus.locked) {
        return jsonResponse(
          { error: `Too many failed login attempts. Please wait ${lockStatus.retryAfter} seconds.` },
          429
        );
      }

      let authenticatedUser: any = null;
      let authenticatedRole: 'ADMIN' | 'MEMBER' | null = null;
      let memberId: string | null = null;

      // 1. Try Admin Login
      if (role !== 'MEMBER') {
        const admin = await db
          .prepare('SELECT id, username, pin_hash, salt FROM admins WHERE LOWER(username) = LOWER(?)')
          .bind(cleanId)
          .first() as any;

        if (admin) {
          const isValid = await verifyPinWebCrypto(cleanPin, admin.pin_hash, admin.salt);
          if (isValid) {
            authenticatedUser = admin;
            authenticatedRole = 'ADMIN';
          }
        }
      }

      // 2. Try Member Login
      if (!authenticatedUser && role !== 'ADMIN') {
        const member = await db
          .prepare(`
            SELECT id, full_name, mobile_phone, account_status, membership_status, pin_hash, salt
            FROM members
            WHERE UPPER(id) = UPPER(?) OR mobile_phone = ?
          `)
          .bind(cleanId, cleanId)
          .first() as any;

        if (member) {
          if (member.account_status === 'SUSPENDED' || member.membership_status === 'INACTIVE') {
            return jsonResponse({ error: 'Your account is inactive. Please contact the administrator.' }, 403);
          }
          const isValid = await verifyPinWebCrypto(cleanPin, member.pin_hash, member.salt);
          if (isValid) {
            authenticatedUser = member;
            authenticatedRole = 'MEMBER';
            memberId = member.id;
          }
        }
      }

      if (!authenticatedUser || !authenticatedRole) {
        await recordFailedLoginAttempt(db, lockKey);
        return jsonResponse({ error: 'Invalid identification or PIN.' }, 401);
      }

      await clearLoginAttempts(db, lockKey);

      // Create Server Session
      const sessionToken = generateSecureToken();
      const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 7; // 7 days
      const now = new Date().toISOString();

      await db
        .prepare(`
          INSERT INTO sessions (token, user_id, username, role, member_id, ip_address, user_agent, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          sessionToken,
          authenticatedUser.id,
          authenticatedUser.username || authenticatedUser.full_name,
          authenticatedRole,
          memberId,
          clientIp,
          request.headers.get('User-Agent') || 'Unknown',
          expiresAt,
          now
        )
        .run();

      await logAudit(
        db,
        authenticatedUser.id,
        authenticatedUser.username || authenticatedUser.full_name,
        authenticatedRole,
        'LOGIN_SUCCESS',
        'AUTH',
        authenticatedUser.id,
        'Successful login from ' + clientIp,
        clientIp
      );

      const cookieHeader = setCookieHeader('uddhyamsheel_session', sessionToken, isProd, 86400 * 7);
      return jsonResponse(
        {
          success: true,
          token: sessionToken,
          user: {
            id: authenticatedUser.id,
            username: authenticatedUser.username || authenticatedUser.full_name,
            fullName: authenticatedUser.full_name || authenticatedUser.username,
            role: authenticatedRole,
            memberId
          }
        },
        200,
        { 'Set-Cookie': cookieHeader }
      );
    } catch (err: any) {
      console.error('Login error:', err);
      return jsonResponse({ error: 'Server authentication failed.' }, 500);
    }
  }

  // ----------------------------------------------------------
  // AUTH: CURRENT USER (/api/auth/me)
  // ----------------------------------------------------------
  if (path === '/api/auth/me' && method === 'GET') {
    const session = await getAuthenticatedUser(request, db);
    if (!session) {
      return jsonResponse({ error: 'Session expired or not authenticated.' }, 401);
    }

    let fullName = session.username;
    if (session.role === 'MEMBER' && session.member_id) {
      const m = await db.prepare('SELECT full_name FROM members WHERE id = ?').bind(session.member_id).first() as any;
      if (m?.full_name) fullName = m.full_name;
    }

    return jsonResponse({
      user: {
        id: session.user_id,
        username: session.username,
        fullName,
        role: session.role,
        memberId: session.member_id
      }
    });
  }

  // ----------------------------------------------------------
  // AUTH: LOGOUT
  // ----------------------------------------------------------
  if (path === '/api/auth/logout' && method === 'POST') {
    const session = await getAuthenticatedUser(request, db);
    if (session) {
      await db.prepare('DELETE FROM sessions WHERE token = ?').bind(session.token).run();
      await logAudit(db, session.user_id, session.username, session.role, 'LOGOUT', 'AUTH', session.user_id, 'User logged out', clientIp);
    }
    const cookieHeader = clearCookieHeader('uddhyamsheel_session', isProd);
    return jsonResponse({ success: true, message: 'Logged out successfully.' }, 200, { 'Set-Cookie': cookieHeader });
  }

  // ==========================================================
  // PROTECTED ENDPOINTS: ALL SUBSEQUENT ROUTES REQUIRE AUTH
  // ==========================================================
  const session = await getAuthenticatedUser(request, db);
  if (!session) {
    return jsonResponse({ error: 'Session expired or not authenticated. Please log in.' }, 401);
  }

  // ----------------------------------------------------------
  // AUTH: CHANGE MEMBER PIN
  // ----------------------------------------------------------
  if (path === '/api/auth/change-member-pin' && method === 'POST') {
    if (session.role !== 'MEMBER' || !session.member_id) {
      return jsonResponse({ error: 'Access denied. Member session required.' }, 403);
    }
    const body = await request.json() as any;
    const currentPin = String(body?.currentPin || '').trim();
    const newPin = String(body?.newPin || '').trim();

    if (!currentPin || !newPin) {
      return jsonResponse({ error: 'Current PIN and new PIN are required.' }, 400);
    }

    const val = validateMemberPin(newPin);
    if (!val.valid) return jsonResponse({ error: val.error }, 400);

    const member = await db.prepare('SELECT pin_hash, salt FROM members WHERE id = ?').bind(session.member_id).first() as any;
    if (!member) return jsonResponse({ error: 'Member record not found.' }, 404);

    const validCurrent = await verifyPinWebCrypto(currentPin, member.pin_hash, member.salt);
    if (!validCurrent) {
      return jsonResponse({ error: 'Current PIN is incorrect.' }, 401);
    }

    const { hash, salt } = await hashPinWebCrypto(newPin);
    await db.prepare('UPDATE members SET pin_hash = ?, salt = ?, updated_at = ? WHERE id = ?')
      .bind(hash, salt, new Date().toISOString(), session.member_id).run();

    await logAudit(db, session.user_id, session.username, 'MEMBER', 'PIN_CHANGED', 'MEMBER', session.member_id, 'Member updated their PIN', clientIp);
    return jsonResponse({ success: true, message: 'Your PIN has been updated successfully.' });
  }

  // ----------------------------------------------------------
  // AUTH: CHANGE ADMIN CREDENTIALS
  // ----------------------------------------------------------
  if (path === '/api/auth/change-admin-credentials' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const body = await request.json() as any;
    const currentPin = String(body?.currentPin || '').trim();
    const newUsername = body?.newUsername ? String(body.newUsername).trim() : null;
    const newPin = body?.newPin ? String(body.newPin).trim() : null;

    if (!currentPin) return jsonResponse({ error: 'Current administrator PIN is required.' }, 400);

    const admin = await db.prepare('SELECT * FROM admins WHERE id = ?').bind(session.user_id).first() as any;
    if (!admin) return jsonResponse({ error: 'Admin account not found.' }, 404);

    const currentValid = await verifyPinWebCrypto(currentPin, admin.pin_hash, admin.salt);
    if (!currentValid) return jsonResponse({ error: 'Current administrator PIN is incorrect.' }, 401);

    if (newPin) {
      const val = validateAdminPin(newPin);
      if (!val.valid) return jsonResponse({ error: val.error }, 400);
      const { hash, salt } = await hashPinWebCrypto(newPin);
      await db.prepare('UPDATE admins SET pin_hash = ?, salt = ?, updated_at = ? WHERE id = ?')
        .bind(hash, salt, new Date().toISOString(), admin.id).run();
    }

    if (newUsername && newUsername !== admin.username) {
      const existing = await db.prepare('SELECT id FROM admins WHERE LOWER(username) = LOWER(?) AND id != ?').bind(newUsername, admin.id).first();
      if (existing) return jsonResponse({ error: 'That username is already taken.' }, 409);
      await db.prepare('UPDATE admins SET username = ?, updated_at = ? WHERE id = ?')
        .bind(newUsername, new Date().toISOString(), admin.id).run();
    }

    await logAudit(db, admin.id, newUsername || admin.username, 'ADMIN', 'CREDENTIALS_CHANGED', 'ADMIN', admin.id, 'Admin updated credentials', clientIp);
    return jsonResponse({ success: true, message: 'Administrator credentials updated successfully.' });
  }

  // ----------------------------------------------------------
  // MEMBER SELF-SERVICE: FINANCIAL SUMMARY
  // ----------------------------------------------------------
  if (path === '/api/members/me/financial-summary' && method === 'GET') {
    if (session.role !== 'MEMBER' || !session.member_id) {
      return jsonResponse({ error: 'Access denied. Member session required.' }, 403);
    }
    const memberId = session.member_id;

    const sa = await db.prepare('SELECT balance FROM savings_accounts WHERE member_id = ?').bind(memberId).first() as any;
    const totalSavings = sa?.balance || 0.0;

    const contrib = await db.prepare("SELECT COALESCE(SUM(amount), 0.0) as total FROM contributions WHERE member_id = ? AND status = 'PAID'").bind(memberId).first() as any;
    const totalContributions = contrib?.total || 0.0;

    const loansRes = await db.prepare('SELECT principal_amount, status FROM loans WHERE member_id = ?').bind(memberId).all();
    const loanRows = loansRes.results || [];
    let totalLoanPrincipal = 0.0;
    for (const l of loanRows) totalLoanPrincipal += Number(l.principal_amount || 0);

    const rep = await db.prepare(`
      SELECT 
        COALESCE(SUM(principal_amount), 0.0) as principal_paid,
        COALESCE(SUM(interest_amount), 0.0) as interest_paid,
        COALESCE(SUM(penalty_amount), 0.0) as penalty_paid,
        COALESCE(SUM(total_amount), 0.0) as total_payments
      FROM loan_repayments WHERE member_id = ?
    `).bind(memberId).first() as any;

    const totalPrincipalPaid = rep?.principal_paid || 0.0;
    const totalInterestPaid = rep?.interest_paid || 0.0;
    const totalPenaltyPaid = rep?.penalty_paid || 0.0;
    const totalLoanPayments = rep?.total_payments || 0.0;
    const outstandingPrincipal = Math.max(0, totalLoanPrincipal - totalPrincipalPaid);

    return jsonResponse({
      memberId,
      totalSavings,
      totalContributions,
      totalLoanPrincipal,
      totalPrincipalPaid,
      totalInterestPaid,
      totalPenaltyPaid,
      totalLoanPayments,
      outstandingPrincipal,
      outstandingInterest: 0.0,
      outstandingPenalty: 0.0,
      totalOutstanding: outstandingPrincipal
    });
  }

  // ----------------------------------------------------------
  // MEMBER SELF-SERVICE: INTEREST HISTORY
  // ----------------------------------------------------------
  if (path === '/api/members/me/interest-history' && method === 'GET') {
    if (session.role !== 'MEMBER' || !session.member_id) {
      return jsonResponse({ error: 'Access denied. Member session required.' }, 403);
    }
    const memberId = session.member_id;
    const loanId = url.searchParams.get('loanId');

    let sql = `
      SELECT r.id, r.loan_id, l.loan_no, r.receipt_no, r.payment_date, r.total_amount,
             r.principal_amount, r.interest_amount, r.penalty_amount, r.remaining_principal,
             r.payment_method, r.remarks
      FROM loan_repayments r
      LEFT JOIN loans l ON r.loan_id = l.id
      WHERE r.member_id = ?
    `;
    const params: any[] = [memberId];
    if (loanId && loanId !== 'ALL') {
      sql += ' AND r.loan_id = ?';
      params.push(loanId);
    }
    sql += ' ORDER BY r.payment_date DESC, r.created_at DESC';

    const res = await db.prepare(sql).bind(...params).all();
    const repayments = res.results || [];

    let totalInterestPaidToDate = 0.0;
    let thisYearInterest = 0.0;
    const currentYearPrefix = '2083';

    for (const r of repayments) {
      const amt = Number(r.interest_amount || 0);
      totalInterestPaidToDate += amt;
      if (r.payment_date && String(r.payment_date).startsWith(currentYearPrefix)) {
        thisYearInterest += amt;
      }
    }

    return jsonResponse({
      memberId,
      totalInterestPaidToDate,
      thisYearInterest,
      thisMonthInterest: 0.0,
      repayments
    });
  }

  // ----------------------------------------------------------
  // MEMBER SELF-SERVICE: PROFILE
  // ----------------------------------------------------------
  if (path === '/api/members/me' && method === 'GET') {
    if (session.role !== 'MEMBER' || !session.member_id) {
      return jsonResponse({ error: 'Access denied. Member session required.' }, 403);
    }
    const member = await db.prepare('SELECT * FROM members WHERE id = ?').bind(session.member_id).first() as any;
    if (!member) return jsonResponse({ error: 'Member not found.' }, 404);
    delete member.pin_hash;
    delete member.salt;
    return jsonResponse({ member });
  }

  // ----------------------------------------------------------
  // MEMBERS: LIST (ADMIN ONLY)
  // ----------------------------------------------------------
  if (path === '/api/members' && method === 'GET') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);

    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');

    let sql = `
      SELECT m.*, 
        COALESCE(s.balance, 0.0) as savings_balance,
        (SELECT COUNT(*) FROM loans l WHERE l.member_id = m.id AND l.status IN ('ACTIVE', 'DISBURSED', 'APPROVED')) as active_loans_count
      FROM members m
      LEFT JOIN savings_accounts s ON s.member_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ' AND (m.full_name LIKE ? OR m.id LIKE ? OR m.mobile_phone LIKE ? OR m.citizenship_no LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (status && status !== 'ALL') {
      sql += ' AND m.membership_status = ?';
      params.push(status);
    }
    if (type && type !== 'ALL') {
      sql += ' AND m.membership_type = ?';
      params.push(type);
    }
    sql += ' ORDER BY m.id ASC';

    const res = await db.prepare(sql).bind(...params).all();
    const members = (res.results || []).map((m: any) => {
      delete m.pin_hash;
      delete m.salt;
      return m;
    });

    return jsonResponse({ members });
  }

  // ----------------------------------------------------------
  // MEMBERS: CREATE (ADMIN ONLY)
  // ----------------------------------------------------------
  if (path === '/api/members' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const body = await request.json() as any;

    const {
      fullName, photoUrl, dob, gender = 'Other', citizenshipNo, address, mobilePhone,
      email, emergencyName, emergencyPhone, membershipType = 'General Member',
      membershipDate, initialPin = '123456', notes
    } = body;

    if (!fullName || !address || !mobilePhone || !membershipDate) {
      return jsonResponse({ error: 'Full Name, Address, Mobile Phone, and Membership Date are required.' }, 400);
    }

    const pinCheck = validateMemberPin(initialPin);
    if (!pinCheck.valid) return jsonResponse({ error: pinCheck.error }, 400);

    // Generate next member ID (MEM-001, MEM-002, ...)
    // Generate next member ID (UDG001, UDG002, UDG003, ...)
const maxRow = await db.prepare(
  "SELECT id FROM members WHERE id LIKE 'UDG%' AND id GLOB 'UDG[0-9]*' ORDER BY CAST(SUBSTR(id, 4) AS INTEGER) DESC LIMIT 1"
).first() as any;

let nextNum = 1;

if (maxRow?.id) {
  const match = maxRow.id.match(/^UDG(\d+)$/);
  if (match) nextNum = parseInt(match[1], 10) + 1;
}

const memberId = `UDG${String(nextNum).padStart(3, '0')}`;

    const { hash, salt } = await hashPinWebCrypto(initialPin);
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO members (
        id, full_name, photo_url, dob, gender, citizenship_no, address, mobile_phone,
        email, emergency_name, emergency_phone, membership_type, membership_date,
        account_status, membership_status, pin_hash, salt, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'ACTIVE', ?, ?, ?, ?, ?)
    `).bind(
      memberId, fullName, photoUrl || null, dob || null, gender, citizenshipNo || null,
      address, mobilePhone, email || null, emergencyName || null, emergencyPhone || null,
      membershipType, membershipDate, hash, salt, notes || null, now, now
    ).run();

    // Auto-create savings account
    const saId = 'SA-' + memberId;
    await db.prepare(`
      INSERT INTO savings_accounts (id, member_id, account_number, balance, interest_accumulated, status, created_at, updated_at)
      VALUES (?, ?, ?, 0.0, 0.0, 'ACTIVE', ?, ?)
    `).bind(saId, memberId, saId, now, now).run();

    await logAudit(db, session.user_id, session.username, 'ADMIN', 'MEMBER_CREATED', 'MEMBER', memberId, `Created member ${fullName} (${memberId})`, clientIp);

    return jsonResponse({
      success: true,
      member: { id: memberId, fullName, mobilePhone, membershipType, membershipDate }
    }, 201);
  }

  // ----------------------------------------------------------
  // MEMBERS: STATEMENT (ADMIN OR SELF)
  // ----------------------------------------------------------
  const statementMatch = path.match(/^\/api\/members\/([^/]+)\/statement$/);
  if (statementMatch && method === 'GET') {
    const targetId = statementMatch[1].toUpperCase();
    if (session.role === 'MEMBER' && session.member_id?.toUpperCase() !== targetId) {
      return jsonResponse({ error: 'Access denied.' }, 403);
    }

    const member = await db.prepare('SELECT id, full_name, mobile_phone, address, membership_date FROM members WHERE id = ?').bind(targetId).first();
    if (!member) return jsonResponse({ error: 'Member not found.' }, 404);

    const savingsRes = await db.prepare('SELECT * FROM savings_transactions WHERE member_id = ? ORDER BY date DESC, created_at DESC').bind(targetId).all();
    const contribRes = await db.prepare('SELECT * FROM contributions WHERE member_id = ? ORDER BY year_bs DESC, month_bs DESC').bind(targetId).all();
    const loansRes = await db.prepare('SELECT * FROM loans WHERE member_id = ? ORDER BY disbursement_date DESC').bind(targetId).all();
    const repaymentsRes = await db.prepare('SELECT * FROM loan_repayments WHERE member_id = ? ORDER BY payment_date DESC').bind(targetId).all();
    const sa = await db.prepare('SELECT balance, account_number FROM savings_accounts WHERE member_id = ?').bind(targetId).first();

    return jsonResponse({
      member,
      savingsAccount: sa || { balance: 0.0, account_number: 'N/A' },
      savings: savingsRes.results || [],
      contributions: contribRes.results || [],
      loans: loansRes.results || [],
      repayments: repaymentsRes.results || []
    });
  }

  // ----------------------------------------------------------
  // MEMBERS: ARCHIVE / RESTORE / RESET-PIN
  // ----------------------------------------------------------
  const archiveMatch = path.match(/^\/api\/members\/([^/]+)\/archive$/);
  if (archiveMatch && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const targetId = archiveMatch[1].toUpperCase();
    await db.prepare("UPDATE members SET membership_status = 'INACTIVE', account_status = 'ARCHIVED', updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), targetId).run();
    await logAudit(db, session.user_id, session.username, 'ADMIN', 'MEMBER_ARCHIVED', 'MEMBER', targetId, `Archived member ${targetId}`, clientIp);
    return jsonResponse({ success: true, message: 'Member archived.' });
  }

  const restoreMatch = path.match(/^\/api\/members\/([^/]+)\/restore$/);
  if (restoreMatch && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const targetId = restoreMatch[1].toUpperCase();
    await db.prepare("UPDATE members SET membership_status = 'ACTIVE', account_status = 'ACTIVE', updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), targetId).run();
    await logAudit(db, session.user_id, session.username, 'ADMIN', 'MEMBER_RESTORED', 'MEMBER', targetId, `Restored member ${targetId}`, clientIp);
    return jsonResponse({ success: true, message: 'Member restored.' });
  }

  const resetPinMatch = path.match(/^\/api\/members\/([^/]+)\/reset-pin$/);
  if (resetPinMatch && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const targetId = resetPinMatch[1].toUpperCase();
    const body = await request.json() as any;
    const newPin = String(body?.newPin || '').trim();

    const val = validateMemberPin(newPin);
    if (!val.valid) return jsonResponse({ error: val.error }, 400);

    const { hash, salt } = await hashPinWebCrypto(newPin);
    await db.prepare('UPDATE members SET pin_hash = ?, salt = ?, updated_at = ? WHERE id = ?')
      .bind(hash, salt, new Date().toISOString(), targetId).run();
    await db.prepare('DELETE FROM sessions WHERE member_id = ?').bind(targetId).run();
    await logAudit(db, session.user_id, session.username, 'ADMIN', 'PIN_RESET', 'MEMBER', targetId, `Reset PIN for member ${targetId}`, clientIp);
    return jsonResponse({ success: true, message: 'Member PIN reset successfully.' });
  }

  // ----------------------------------------------------------
  // MEMBERS: SINGLE MEMBER BY ID (GET, PUT, DELETE)
  // ----------------------------------------------------------
  const memberIdMatch = path.match(/^\/api\/members\/([^/]+)$/);
  if (memberIdMatch) {
    const targetId = memberIdMatch[1].toUpperCase();

    if (method === 'GET') {
      if (session.role === 'MEMBER' && session.member_id?.toUpperCase() !== targetId) {
        return jsonResponse({ error: 'Access denied. You may only view your own records.' }, 403);
      }
      const member = await db.prepare('SELECT * FROM members WHERE id = ?').bind(targetId).first() as any;
      if (!member) return jsonResponse({ error: 'Member not found.' }, 404);
      delete member.pin_hash;
      delete member.salt;

      const sa = await db.prepare('SELECT * FROM savings_accounts WHERE member_id = ?').bind(targetId).first();
      const contrib = await db.prepare('SELECT COALESCE(SUM(amount), 0.0) as total FROM contributions WHERE member_id = ?').bind(targetId).first() as any;
      const activeLoans = await db.prepare("SELECT * FROM loans WHERE member_id = ? AND status IN ('ACTIVE', 'DISBURSED', 'APPROVED')").bind(targetId).all();
      const repayments = await db.prepare('SELECT COALESCE(SUM(principal_amount), 0.0) as paid, COALESCE(SUM(interest_amount), 0.0) as interest FROM loan_repayments WHERE member_id = ?').bind(targetId).first() as any;
      const totalBorrowed = await db.prepare('SELECT COALESCE(SUM(principal_amount), 0.0) as borrowed FROM loans WHERE member_id = ?').bind(targetId).first() as any;
      const certs = await db.prepare('SELECT * FROM certificates WHERE member_id = ? ORDER BY issue_date DESC').bind(targetId).all();
      const docs = await db.prepare('SELECT * FROM documents WHERE member_id = ? ORDER BY uploaded_at DESC').bind(targetId).all();

      const borrowed = totalBorrowed?.borrowed || 0.0;
      const principalPaid = repayments?.paid || 0.0;

      return jsonResponse({
        member,
        savingsAccount: sa || { balance: 0.0, account_number: 'N/A' },
        totalContributions: contrib?.total || 0.0,
        loanSummary: {
          total_borrowed: borrowed,
          total_outstanding: Math.max(0, borrowed - principalPaid),
          total_principal_paid: principalPaid,
          total_interest_paid: repayments?.interest || 0.0
        },
        activeLoans: activeLoans.results || [],
        certificates: certs.results || [],
        documents: docs.results || []
      });
    }

    if (method === 'PUT') {
      if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
      const b = await request.json() as any;
      const now = new Date().toISOString();

      await db.prepare(`
        UPDATE members SET
          full_name = COALESCE(?, full_name),
          photo_url = ?,
          dob = ?,
          gender = COALESCE(?, gender),
          citizenship_no = ?,
          address = COALESCE(?, address),
          mobile_phone = COALESCE(?, mobile_phone),
          email = ?,
          emergency_name = ?,
          emergency_phone = ?,
          membership_type = COALESCE(?, membership_type),
          membership_date = COALESCE(?, membership_date),
          notes = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        b.fullName || null, b.photoUrl || null, b.dob || null, b.gender || null,
        b.citizenshipNo || null, b.address || null, b.mobilePhone || null, b.email || null,
        b.emergencyName || null, b.emergencyPhone || null, b.membershipType || null,
        b.membershipDate || null, b.notes || null, now, targetId
      ).run();

      await logAudit(db, session.user_id, session.username, 'ADMIN', 'MEMBER_UPDATED', 'MEMBER', targetId, `Updated member profile ${targetId}`, clientIp);
      return jsonResponse({ success: true, message: 'Member updated successfully.' });
    }

    if (method === 'DELETE') {
      if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
      const body = await request.json().catch(() => ({})) as any;
      if (body?.confirmId?.toUpperCase() !== targetId) {
        return jsonResponse({ error: 'Please confirm deletion by providing exact Member ID.' }, 400);
      }

      const activeLoan = await db.prepare("SELECT COUNT(*) as count FROM loans WHERE member_id = ? AND status IN ('ACTIVE', 'DISBURSED')").bind(targetId).first() as any;
      if (activeLoan?.count > 0) {
        return jsonResponse({ error: 'Cannot delete member with active or disbursed loans.' }, 400);
      }

      const sa = await db.prepare('SELECT balance FROM savings_accounts WHERE member_id = ?').bind(targetId).first() as any;
      if (sa?.balance > 0) {
        return jsonResponse({ error: 'Cannot delete member with remaining savings balance. Please withdraw funds first.' }, 400);
      }

      await db.prepare('DELETE FROM savings_transactions WHERE member_id = ?').bind(targetId).run();
      await db.prepare('DELETE FROM savings_accounts WHERE member_id = ?').bind(targetId).run();
      await db.prepare('DELETE FROM contributions WHERE member_id = ?').bind(targetId).run();
      await db.prepare('DELETE FROM certificates WHERE member_id = ?').bind(targetId).run();
      await db.prepare('DELETE FROM documents WHERE member_id = ?').bind(targetId).run();
      await db.prepare('DELETE FROM members WHERE id = ?').bind(targetId).run();

      await logAudit(db, session.user_id, session.username, 'ADMIN', 'MEMBER_DELETED', 'MEMBER', targetId, `Permanently deleted member ${targetId}`, clientIp);
      return jsonResponse({ success: true, message: 'Member deleted.' });
    }
  }

  // ----------------------------------------------------------
  // SAVINGS: ACCOUNTS (ADMIN ONLY) & SINGLE ACCOUNT
  // ----------------------------------------------------------
  if (path === '/api/savings/accounts' && method === 'GET') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);

    const res = await db.prepare(`
      SELECT s.*, m.full_name as member_name, m.mobile_phone, m.membership_status
      FROM savings_accounts s
      LEFT JOIN members m ON m.id = s.member_id
      ORDER BY s.member_id ASC
    `).all();

    const accounts = res.results || [];
    let totalBalance = 0;
    let totalInterest = 0;
    for (const a of accounts) {
      totalBalance += Number(a.balance || 0);
      totalInterest += Number(a.interest_accumulated || 0);
    }

    return jsonResponse({
      accounts,
      summary: { totalBalance, totalInterest, totalAccounts: accounts.length }
    });
  }

  const savingsMemberMatch = path.match(/^\/api\/savings\/accounts\/([^/]+)$/);
  if (savingsMemberMatch && method === 'GET') {
    const memberId = savingsMemberMatch[1].toUpperCase();
    if (session.role === 'MEMBER' && session.member_id?.toUpperCase() !== memberId) {
      return jsonResponse({ error: 'Access denied.' }, 403);
    }

    const sa = await db.prepare(`
      SELECT s.*, m.full_name as member_name
      FROM savings_accounts s
      LEFT JOIN members m ON m.id = s.member_id
      WHERE s.member_id = ?
    `).bind(memberId).first();

    const txRes = await db.prepare('SELECT * FROM savings_transactions WHERE member_id = ? ORDER BY date DESC, created_at DESC').bind(memberId).all();
    return jsonResponse({ account: sa || null, transactions: txRes.results || [] });
  }

  // ----------------------------------------------------------
  // SAVINGS: DEPOSIT & WITHDRAW
  // ----------------------------------------------------------
  if (path === '/api/savings/deposit' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const b = await request.json() as any;
    const memberId = String(b.memberId || '').toUpperCase();
    const amount = Number(b.amount || 0);
    const paymentMethod = b.paymentMethod || 'CASH';
    const description = b.description || 'Savings Deposit';

    if (!memberId || amount <= 0) return jsonResponse({ error: 'Valid member ID and positive amount required.' }, 400);

    const sa = await db.prepare('SELECT * FROM savings_accounts WHERE member_id = ?').bind(memberId).first() as any;
    if (!sa) return jsonResponse({ error: 'Savings account not found.' }, 404);

    const newBalance = Number(sa.balance || 0) + amount;
    const now = new Date().toISOString();
    const receiptNo = 'RCT-S-' + Date.now();
    const txId = 'stx-' + crypto.randomUUID();

    await db.prepare(`
      INSERT INTO savings_transactions (id, account_id, member_id, type, amount, balance_after, date, receipt_no, payment_method, description, created_by, created_at)
      VALUES (?, ?, ?, 'DEPOSIT', ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(txId, sa.id, memberId, amount, newBalance, b.date || now.slice(0, 10), receiptNo, paymentMethod, description, session.username, now).run();

    await db.prepare('UPDATE savings_accounts SET balance = ?, updated_at = ? WHERE id = ?').bind(newBalance, now, sa.id).run();

    // General ledger entry
    await db.prepare(`
      INSERT INTO general_ledger (id, entry_date, account_code, account_name, debit, credit, balance_after, reference_type, reference_id, receipt_no, description, created_at)
      VALUES (?, ?, '1001', 'Member Savings Fund', ?, 0, ?, 'SAVINGS_DEPOSIT', ?, ?, ?, ?)
    `).bind('gl-' + crypto.randomUUID(), now.slice(0, 10), amount, newBalance, txId, receiptNo, `Savings deposit for ${memberId}`, now).run();

    await logAudit(db, session.user_id, session.username, 'ADMIN', 'SAVINGS_DEPOSIT', 'SAVINGS', memberId, `Deposited Rs. ${amount} to ${memberId}`, clientIp);
    return jsonResponse({ success: true, receiptNo, transaction: { receiptNo, amount, balanceAfter: newBalance } });
  }

  if (path === '/api/savings/withdraw' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const b = await request.json() as any;
    const memberId = String(b.memberId || '').toUpperCase();
    const amount = Number(b.amount || 0);
    const paymentMethod = b.paymentMethod || 'CASH';
    const description = b.description || 'Savings Withdrawal';

    if (!memberId || amount <= 0) return jsonResponse({ error: 'Valid member ID and positive amount required.' }, 400);

    const sa = await db.prepare('SELECT * FROM savings_accounts WHERE member_id = ?').bind(memberId).first() as any;
    if (!sa) return jsonResponse({ error: 'Savings account not found.' }, 404);

    const currentBalance = Number(sa.balance || 0);
    if (currentBalance < amount) {
      return jsonResponse({ error: `Insufficient savings balance. Current balance is Rs. ${currentBalance.toLocaleString()}.` }, 400);
    }

    const newBalance = currentBalance - amount;
    const now = new Date().toISOString();
    const receiptNo = 'RCT-SW-' + Date.now();
    const txId = 'stx-' + crypto.randomUUID();

    await db.prepare(`
      INSERT INTO savings_transactions (id, account_id, member_id, type, amount, balance_after, date, receipt_no, payment_method, description, created_by, created_at)
      VALUES (?, ?, ?, 'WITHDRAWAL', ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(txId, sa.id, memberId, amount, newBalance, b.date || now.slice(0, 10), receiptNo, paymentMethod, description, session.username, now).run();

    await db.prepare('UPDATE savings_accounts SET balance = ?, updated_at = ? WHERE id = ?').bind(newBalance, now, sa.id).run();

    await logAudit(db, session.user_id, session.username, 'ADMIN', 'SAVINGS_WITHDRAWAL', 'SAVINGS', memberId, `Withdrew Rs. ${amount} from ${memberId}`, clientIp);
    return jsonResponse({ success: true, receiptNo, transaction: { receiptNo, amount, balanceAfter: newBalance } });
  }

  // ----------------------------------------------------------
  // SAVINGS: TRANSACTIONS LIST
  // ----------------------------------------------------------
  if (path === '/api/savings/transactions' && method === 'GET') {
    let memberId = url.searchParams.get('memberId');
    if (session.role === 'MEMBER') memberId = session.member_id;

    let sql = `
      SELECT st.*, m.full_name as member_name
      FROM savings_transactions st
      LEFT JOIN members m ON m.id = st.member_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (memberId) {
      sql += ' AND st.member_id = ?';
      params.push(memberId);
    }
    sql += ' ORDER BY st.date DESC, st.created_at DESC LIMIT 100';

    const res = await db.prepare(sql).bind(...params).all();
    return jsonResponse({ transactions: res.results || [] });
  }

  // ----------------------------------------------------------
  // CONTRIBUTIONS: GET, RECORD, BULK
  // ----------------------------------------------------------
  if (path === '/api/contributions' && method === 'GET') {
    let memberId = url.searchParams.get('memberId');
    if (session.role === 'MEMBER') memberId = session.member_id;

    const yearBS = url.searchParams.get('yearBS') || url.searchParams.get('year');
    const monthBS = url.searchParams.get('monthBS');

    let sql = `
      SELECT c.*, m.full_name as member_name, m.mobile_phone
      FROM contributions c
      LEFT JOIN members m ON m.id = c.member_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (memberId) {
      sql += ' AND c.member_id = ?';
      params.push(memberId);
    }
    if (yearBS) {
      sql += ' AND c.year_bs = ?';
      params.push(Number.parseInt(yearBS, 10));
    }
    if (monthBS) {
      sql += ' AND c.month_bs = ?';
      params.push(Number.parseInt(monthBS, 10));
    }
    sql += ' ORDER BY c.year_bs DESC, c.month_bs DESC, c.member_id ASC';

    const res = await db.prepare(sql).bind(...params).all();
    const contributions = res.results || [];

    let totalCollected = 0;
    for (const c of contributions) totalCollected += Number(c.amount || 0);

    return jsonResponse({
      contributions,
      summary: { totalCollected, memberCount: contributions.length }
    });
  }

  if (path === '/api/contributions' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const b = await request.json() as any;
    const memberId = String(b.memberId || '').toUpperCase();
    const yearBS = Number(b.yearBS || b.year || 2083);
    const monthBS = Number(b.monthBS || 1);
    const amount = Number(b.amount || 0);
    const lateFee = Number(b.lateFee || 0);
    const paymentDate = b.paymentDate || new Date().toISOString().slice(0, 10);
    const paymentMethod = b.paymentMethod || 'CASH';
    const remarks = b.remarks || b.notes || null;

    if (!memberId || amount <= 0) return jsonResponse({ error: 'Valid member ID and positive contribution amount required.' }, 400);

    const receiptNo = 'RCT-C-' + Date.now();
    const cid = 'cnt-' + crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO contributions (id, member_id, year_bs, month_bs, amount, lateFee, payment_date, receipt_no, payment_method, status, remarks, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?)
      ON CONFLICT(member_id, year_bs, month_bs)
      DO UPDATE SET amount = excluded.amount, lateFee = excluded.lateFee, payment_date = excluded.payment_date, receipt_no = excluded.receipt_no, remarks = excluded.remarks
    `).bind(cid, memberId, yearBS, monthBS, amount, lateFee, paymentDate, receiptNo, paymentMethod, remarks, session.username, now).run();

    await logAudit(db, session.user_id, session.username, 'ADMIN', 'CONTRIBUTION_RECORDED', 'CONTRIBUTION', memberId, `Recorded Rs. ${amount} contribution for ${memberId} (${yearBS}/${monthBS})`, clientIp);
    return jsonResponse({ success: true, receiptNo, contribution: { memberId, yearBS, monthBS, amount, lateFee, receiptNo } }, 201);
  }

  if (path === '/api/contributions/bulk' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const b = await request.json() as any;
    const yearBS = Number(b.yearBS || 2083);
    const monthBS = Number(b.monthBS || 1);
    const records = Array.isArray(b.records) ? b.records : [];
    const now = new Date().toISOString();

    for (const r of records) {
      const mid = String(r.memberId || '').toUpperCase();
      const amt = Number(r.amount || 0);
      if (!mid || amt <= 0) continue;
      const rct = 'RCT-CB-' + Date.now() + '-' + mid;
      await db.prepare(`
        INSERT INTO contributions (id, member_id, year_bs, month_bs, amount, lateFee, payment_date, receipt_no, payment_method, status, remarks, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CASH', 'PAID', 'Bulk collection', ?, ?)
        ON CONFLICT(member_id, year_bs, month_bs)
        DO UPDATE SET amount = excluded.amount, lateFee = excluded.lateFee, payment_date = excluded.payment_date
      `).bind('cnt-' + crypto.randomUUID(), mid, yearBS, monthBS, amt, Number(r.lateFee || 0), now.slice(0, 10), rct, session.username, now).run();
    }

    return jsonResponse({ success: true, count: records.length });
  }

  // ----------------------------------------------------------
  // LOANS: LIST, PROFIT SHARING, GET SINGLE, CREATE, APPROVE, REPAY
  // ----------------------------------------------------------
  if (path === '/api/loans' && method === 'GET') {
    let memberId = url.searchParams.get('memberId');
    if (session.role === 'MEMBER') memberId = session.member_id;
    const status = url.searchParams.get('status');

    let sql = `
      SELECT l.*, m.full_name as member_name, m.mobile_phone,
        COALESCE((SELECT SUM(principal_amount) FROM loan_repayments r WHERE r.loan_id = l.id), 0.0) as principal_paid,
        COALESCE((SELECT SUM(interest_amount) FROM loan_repayments r WHERE r.loan_id = l.id), 0.0) as interest_paid,
        l.principal_amount - COALESCE((SELECT SUM(principal_amount) FROM loan_repayments r WHERE r.loan_id = l.id), 0.0) as remaining_principal
      FROM loans l
      LEFT JOIN members m ON m.id = l.member_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (memberId) {
      sql += ' AND l.member_id = ?';
      params.push(memberId);
    }
    if (status && status !== 'ALL') {
      sql += ' AND l.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY l.disbursement_date DESC';

    const res = await db.prepare(sql).bind(...params).all();
    return jsonResponse({ loans: res.results || [] });
  }

  if (path === '/api/loans/profit-sharing' && method === 'GET') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);

    const res = await db.prepare(`
      SELECT r.member_id, m.full_name as member_name, SUM(r.interest_amount) as total_interest_paid
      FROM loan_repayments r
      LEFT JOIN members m ON m.id = r.member_id
      GROUP BY r.member_id
      HAVING SUM(r.interest_amount) > 0
    `).all();

    const members = res.results || [];
    let totalEligibleInterest = 0;
    for (const m of members) totalEligibleInterest += Number(m.total_interest_paid || 0);
    const estimatedPool = totalEligibleInterest * 0.70;

    return jsonResponse({
      eligibleMembers: members,
      totalEligibleInterest,
      estimatedPool
    });
  }

  if (path === '/api/loans/distribute-profit' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const b = await request.json() as any;
    const fiscalYearBS = String(b.fiscalYearBS || '2082/2083');
    const totalProfitPool = Number(b.totalProfitPool || 0);
    const distributions = Array.isArray(b.distributions) ? b.distributions : [];
    const now = new Date().toISOString();

    const pid = 'pdist-' + crypto.randomUUID();
    await db.prepare(`
      INSERT INTO profit_distributions (id, fiscal_year_bs, total_profit_pool, member_count, share_per_member, distribution_date, status, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'DISTRIBUTED', ?, ?)
    `).bind(pid, fiscalYearBS, totalProfitPool, distributions.length, distributions.length ? totalProfitPool / distributions.length : 0, now.slice(0, 10), session.username, now).run();

    for (const d of distributions) {
      const mid = String(d.memberId).toUpperCase();
      const amt = Number(d.amount || 0);
      if (amt <= 0) continue;

      const sa = await db.prepare('SELECT id, balance FROM savings_accounts WHERE member_id = ?').bind(mid).first() as any;
      if (sa) {
        const newBal = Number(sa.balance || 0) + amt;
        await db.prepare('UPDATE savings_accounts SET balance = ?, updated_at = ? WHERE id = ?').bind(newBal, now, sa.id).run();
        await db.prepare(`
          INSERT INTO savings_transactions (id, account_id, member_id, type, amount, balance_after, date, receipt_no, payment_method, description, created_by, created_at)
          VALUES (?, ?, ?, 'INTEREST_CREDIT', ?, ?, ?, ?, 'DIVIDEND', ?, ?, ?)
        `).bind('stx-' + crypto.randomUUID(), sa.id, mid, amt, newBal, now.slice(0, 10), 'DIV-' + Date.now(), `Dividend / Profit Share for FY ${fiscalYearBS}`, session.username, now).run();
      }
    }

    await logAudit(db, session.user_id, session.username, 'ADMIN', 'PROFIT_DISTRIBUTED', 'PROFIT', fiscalYearBS, `Distributed Rs. ${totalProfitPool} profit pool for FY ${fiscalYearBS}`, clientIp);
    return jsonResponse({ success: true, count: distributions.length });
  }

  if (path === '/api/loans' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const b = await request.json() as any;
    const memberId = String(b.memberId || '').toUpperCase();
    const principalAmount = Number(b.principalAmount || b.loanAmount || 0);
    const interestRate = Number(b.interestRate || 12);
    const durationMonths = Number(b.durationMonths || 12);
    const disbursementDate = b.disbursementDate || new Date().toISOString().slice(0, 10);
    const purpose = b.purpose || 'Group Micro-Enterprise';
    const collateralDetails = b.collateralDetails || null;
    const guarantorMemberId = b.guarantorMemberId || null;
    const guarantorName = b.guarantorName || null;
    const interestMethod = b.interestMethod || 'REDUCING_BALANCE';

    if (!memberId || principalAmount <= 0) return jsonResponse({ error: 'Valid member and loan amount required.' }, 400);

    const loanId = 'LN-' + Date.now();
    const r = (interestRate / 100) / 12;
    const installment = durationMonths > 0 && r > 0
      ? (principalAmount * r * Math.pow(1 + r, durationMonths)) / (Math.pow(1 + r, durationMonths) - 1)
      : principalAmount / (durationMonths || 1);

    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO loans (
        id, loan_no, member_id, principal_amount, interest_rate, interest_method,
        duration_months, disbursement_date, maturity_date, monthly_installment,
        purpose, guarantor_member_id, guarantor_name, collateral_details, status,
        approved_by, approved_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)
    `).bind(
      loanId, loanId, memberId, principalAmount, interestRate, interestMethod,
      durationMonths, disbursementDate, b.maturityDate || null, Math.round(installment),
      purpose, guarantorMemberId, guarantorName, collateralDetails, session.username,
      disbursementDate, now, now
    ).run();

    await logAudit(db, session.user_id, session.username, 'ADMIN', 'LOAN_CREATED', 'LOAN', loanId, `Created loan ${loanId} for ${memberId} of Rs. ${principalAmount}`, clientIp);
    return jsonResponse({ success: true, loan: { id: loanId, loanNo: loanId, principalAmount } }, 201);
  }

  const loanRepaymentMatch = path.match(/^\/api\/loans\/([^/]+)\/repayments$/);
  if (loanRepaymentMatch && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const loanId = loanRepaymentMatch[1];
    const b = await request.json() as any;

    const totalAmount = Number(b.totalAmount || 0);
    const principalAmount = Number(b.principalAmount || 0);
    const interestAmount = Number(b.interestAmount || 0);
    const penaltyAmount = Number(b.penaltyAmount || 0);
    const paymentDate = b.paymentDate || new Date().toISOString().slice(0, 10);
    const paymentMethod = b.paymentMethod || 'CASH';
    const remarks = b.remarks || null;

    if (totalAmount <= 0) return jsonResponse({ error: 'Payment amount must be greater than zero.' }, 400);

    const loan = await db.prepare('SELECT * FROM loans WHERE id = ?').bind(loanId).first() as any;
    if (!loan) return jsonResponse({ error: 'Loan not found.' }, 404);

    const prior = await db.prepare('SELECT COALESCE(SUM(principal_amount), 0.0) as paid FROM loan_repayments WHERE loan_id = ?').bind(loanId).first() as any;
    const currentRemaining = Number(loan.principal_amount || 0) - Number(prior?.paid || 0);
    const remainingPrincipal = Math.max(0, currentRemaining - principalAmount);

    const receiptNo = 'RCT-L-' + Date.now();
    const repId = 'rep-' + crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO loan_repayments (id, loan_id, member_id, receipt_no, payment_date, total_amount, principal_amount, interest_amount, penalty_amount, remaining_principal, payment_method, remarks, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(repId, loanId, loan.member_id, receiptNo, paymentDate, totalAmount, principalAmount, interestAmount, penaltyAmount, remainingPrincipal, paymentMethod, remarks, session.username, now).run();

    if (remainingPrincipal <= 0) {
      await db.prepare("UPDATE loans SET status = 'CLOSED', updated_at = ? WHERE id = ?").bind(now, loanId).run();
    }

    await logAudit(db, session.user_id, session.username, 'ADMIN', 'LOAN_REPAYMENT', 'LOAN', loanId, `Repayment of Rs. ${totalAmount} recorded for loan ${loanId}`, clientIp);
    return jsonResponse({ success: true, receiptNo, remainingPrincipal });
  }

  const loanApproveMatch = path.match(/^\/api\/loans\/([^/]+)\/approve$/);
  if (loanApproveMatch && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const loanId = loanApproveMatch[1];
    const now = new Date().toISOString();
    await db.prepare("UPDATE loans SET status = 'ACTIVE', approved_by = ?, approved_date = ?, updated_at = ? WHERE id = ?")
      .bind(session.username, now.slice(0, 10), now, loanId).run();
    return jsonResponse({ success: true, message: 'Loan approved.' });
  }

  const singleLoanMatch = path.match(/^\/api\/loans\/([^/]+)$/);
  if (singleLoanMatch && method === 'GET') {
    const loanId = singleLoanMatch[1];
    const loan = await db.prepare(`
      SELECT l.*, m.full_name as member_name, m.mobile_phone
      FROM loans l
      LEFT JOIN members m ON m.id = l.member_id
      WHERE l.id = ?
    `).bind(loanId).first() as any;

    if (!loan) return jsonResponse({ error: 'Loan not found.' }, 404);
    if (session.role === 'MEMBER' && session.member_id?.toUpperCase() !== loan.member_id?.toUpperCase()) {
      return jsonResponse({ error: 'Access denied.' }, 403);
    }

    const repRes = await db.prepare('SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY payment_date DESC').bind(loanId).all();
    return jsonResponse({ loan, repayments: repRes.results || [] });
  }

  // ----------------------------------------------------------
  // ACCOUNTING: CASH & BANK, TRANSFERS, GENERAL LEDGER
  // ----------------------------------------------------------
  if (path === '/api/accounting/accounts' && method === 'GET') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);

    const acctsRes = await db.prepare('SELECT * FROM cash_bank_accounts ORDER BY type ASC, account_name ASC').all();
    const accounts = acctsRes.results || [];

    const txRes = await db.prepare(`
      SELECT t.*, a.account_name
      FROM cash_bank_transactions t
      LEFT JOIN cash_bank_accounts a ON a.id = t.account_id
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 50
    `).all();

    let totalCash = 0;
    let totalBank = 0;
    for (const a of accounts) {
      const bal = Number(a.current_balance || 0);
      if (a.type === 'CASH') totalCash += bal;
      else totalBank += bal;
    }

    return jsonResponse({
      accounts,
      transactions: txRes.results || [],
      totals: { totalCash, totalBank, totalLiquidity: totalCash + totalBank }
    });
  }

  if (path === '/api/accounting/transfer' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const b = await request.json() as any;
    const fromId = b.fromAccountId;
    const toId = b.toAccountId;
    const amount = Number(b.amount || 0);
    const desc = b.description || 'Inter-account transfer';
    const date = b.date || new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    if (!fromId || !toId || fromId === toId || amount <= 0) {
      return jsonResponse({ error: 'Invalid source/destination account or transfer amount.' }, 400);
    }

    const fromAcct = await db.prepare('SELECT * FROM cash_bank_accounts WHERE id = ?').bind(fromId).first() as any;
    const toAcct = await db.prepare('SELECT * FROM cash_bank_accounts WHERE id = ?').bind(toId).first() as any;
    if (!fromAcct || !toAcct) return jsonResponse({ error: 'Accounts not found.' }, 404);

    if (Number(fromAcct.current_balance || 0) < amount) {
      return jsonResponse({ error: 'Insufficient funds in source account.' }, 400);
    }

    const fromNewBal = Number(fromAcct.current_balance || 0) - amount;
    const toNewBal = Number(toAcct.current_balance || 0) + amount;

    await db.prepare('UPDATE cash_bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?').bind(fromNewBal, now, fromId).run();
    await db.prepare('UPDATE cash_bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?').bind(toNewBal, now, toId).run();

    await db.prepare(`
      INSERT INTO cash_bank_transactions (id, account_id, type, amount, balance_after, date, category, description, created_by, created_at)
      VALUES (?, ?, 'DEBIT', ?, ?, ?, 'TRANSFER_OUT', ?, ?, ?)
    `).bind('cbt-' + crypto.randomUUID(), fromId, amount, fromNewBal, date, desc, session.username, now).run();

    await db.prepare(`
      INSERT INTO cash_bank_transactions (id, account_id, type, amount, balance_after, date, category, description, created_by, created_at)
      VALUES (?, ?, 'CREDIT', ?, ?, ?, 'TRANSFER_IN', ?, ?, ?)
    `).bind('cbt-' + crypto.randomUUID(), toId, amount, toNewBal, date, desc, session.username, now).run();

    await logAudit(db, session.user_id, session.username, 'ADMIN', 'FUNDS_TRANSFERRED', 'ACCOUNTING', fromId, `Transferred Rs. ${amount} from ${fromAcct.account_name} to ${toAcct.account_name}`, clientIp);
    return jsonResponse({ success: true, message: 'Transfer completed.' });
  }

  if (path === '/api/accounting/ledger' && method === 'GET') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const start = url.searchParams.get('startDate');
    const end = url.searchParams.get('endDate');
    const code = url.searchParams.get('accountCode');

    let sql = 'SELECT * FROM general_ledger WHERE 1=1';
    const params: any[] = [];
    if (start) {
      sql += ' AND entry_date >= ?';
      params.push(start);
    }
    if (end) {
      sql += ' AND entry_date <= ?';
      params.push(end);
    }
    if (code) {
      sql += ' AND account_code = ?';
      params.push(code);
    }
    sql += ' ORDER BY entry_date DESC, created_at DESC LIMIT 100';

    const res = await db.prepare(sql).bind(...params).all();
    const entries = res.results || [];
    let totalDebit = 0;
    let totalCredit = 0;
    for (const e of entries) {
      totalDebit += Number(e.debit || 0);
      totalCredit += Number(e.credit || 0);
    }

    return jsonResponse({ entries, totals: { totalDebit, totalCredit, netBalance: totalDebit - totalCredit } });
  }

  // ----------------------------------------------------------
  // ACCOUNTING: INVESTMENTS & ASSETS/LIABILITIES
  // ----------------------------------------------------------
  if (path === '/api/accounting/investments' && method === 'GET') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const res = await db.prepare('SELECT * FROM investments ORDER BY start_date DESC').all();
    const investments = res.results || [];
    let totalInvested = 0;
    let currentValuation = 0;
    for (const inv of investments) {
      totalInvested += Number(inv.amount_invested || 0);
      currentValuation += Number(inv.current_valuation || 0);
    }
    return jsonResponse({ investments, summary: { totalInvested, currentValuation, unrealizedGain: currentValuation - totalInvested } });
  }

  if (path === '/api/accounting/investments' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const b = await request.json() as any;
    const invId = 'inv-' + crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO investments (id, title, type, amount_invested, current_valuation, start_date, expected_return_rate, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
    `).bind(invId, b.title, b.type || 'EQUITY', Number(b.amountInvested || 0), Number(b.currentValuation || b.amountInvested || 0), b.startDate || now.slice(0, 10), b.expectedReturnRate || null, b.notes || null, now, now).run();
    return jsonResponse({ success: true, id: invId }, 201);
  }

  if (path === '/api/accounting/assets-liabilities' && method === 'GET') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const res = await db.prepare('SELECT * FROM assets_liabilities ORDER BY as_of_date DESC').all();
    const records = res.results || [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    for (const r of records) {
      const amt = Number(r.amount || 0);
      if (String(r.category).includes('ASSET')) totalAssets += amt;
      else if (String(r.category).includes('LIABILITY')) totalLiabilities += amt;
    }
    return jsonResponse({ records, summary: { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities } });
  }

  if (path === '/api/accounting/assets-liabilities' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const b = await request.json() as any;
    const alId = 'al-' + crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO assets_liabilities (id, category, title, amount, as_of_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(alId, b.category || 'FIXED_ASSET', b.title, Number(b.amount || 0), b.asOfDate || now.slice(0, 10), b.notes || null, now, now).run();
    return jsonResponse({ success: true, id: alId }, 201);
  }

  // ----------------------------------------------------------
  // DASHBOARD & REPORTS (ADMIN ONLY)
  // ----------------------------------------------------------
  if (path === '/api/dashboard-reports' && method === 'GET') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);

    const mCount = await db.prepare("SELECT COUNT(*) as count FROM members WHERE membership_status = 'ACTIVE'").first() as any;
    const saSum = await db.prepare('SELECT COALESCE(SUM(balance), 0.0) as total FROM savings_accounts').first() as any;
    const loansDisbursed = await db.prepare("SELECT COALESCE(SUM(principal_amount), 0.0) as total FROM loans WHERE status IN ('ACTIVE', 'DISBURSED', 'CLOSED')").first() as any;
    const repaymentsSum = await db.prepare('SELECT COALESCE(SUM(principal_amount), 0.0) as total FROM loan_repayments').first() as any;
    const contribSum = await db.prepare("SELECT COALESCE(SUM(amount), 0.0) as total FROM contributions WHERE status = 'PAID'").first() as any;
    const cashBankSum = await db.prepare('SELECT COALESCE(SUM(current_balance), 0.0) as total FROM cash_bank_accounts').first() as any;
    const actRes = await db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 8').all();
    const rules = await db.prepare("SELECT data FROM settings WHERE id = 'financial_rules'").first() as any;

    const disbursed = Number(loansDisbursed?.total || 0);
    const repaid = Number(repaymentsSum?.total || 0);

    return jsonResponse({
      summary: {
        totalMembers: mCount?.count || 0,
        totalSavings: saSum?.total || 0.0,
        totalLoansDisbursed: disbursed,
        totalOutstandingLoans: Math.max(0, disbursed - repaid),
        totalContributions: contribSum?.total || 0.0,
        cashBankTotal: cashBankSum?.total || 0.0
      },
      recentActivities: actRes.results || [],
      monthlyFlow: [],
      rules: rules?.data ? JSON.parse(rules.data) : null
    });
  }

  // ----------------------------------------------------------
  // AUDIT LOGS (ADMIN ONLY)
  // ----------------------------------------------------------
  if (path === '/api/audit-logs' && method === 'GET') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const limit = Number.parseInt(url.searchParams.get('limit') || '50', 10);
    const res = await db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?').bind(limit).all();
    return jsonResponse({ logs: res.results || [] });
  }

  // ----------------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------------
  if (path === '/api/notifications' && method === 'GET') {
    const role = session.role;
    const mid = session.member_id || '';
    const res = await db.prepare(`
      SELECT * FROM notifications
      WHERE recipient_role = 'ALL' OR recipient_role = ? OR recipient_member_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).bind(role, mid).all();

    const notifs = res.results || [];
    let unreadCount = 0;
    for (const n of notifs) {
      if (Number(n.is_read || 0) === 0) unreadCount++;
    }

    return jsonResponse({ notifications: notifs, unreadCount });
  }

  if (path === '/api/notifications' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const b = await request.json() as any;
    const nid = 'ntf-' + crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO notifications (id, recipient_role, recipient_member_id, title, message, type, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(nid, b.recipientRole || 'ALL', b.recipientMemberId || null, b.title, b.message, b.type || 'INFO', now).run();
    return jsonResponse({ success: true, id: nid }, 201);
  }

  const notifReadMatch = path.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (notifReadMatch && method === 'POST') {
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').bind(notifReadMatch[1]).run();
    return jsonResponse({ success: true });
  }

  if (path === '/api/notifications/read-all' && method === 'POST') {
    await db.prepare(`
      UPDATE notifications SET is_read = 1
      WHERE recipient_role = 'ALL' OR recipient_role = ? OR recipient_member_id = ?
    `).bind(session.role, session.member_id || '').run();
    return jsonResponse({ success: true });
  }

  // ----------------------------------------------------------
  // CERTIFICATES & DOCUMENTS
  // ----------------------------------------------------------
  if (path === '/api/certificates' && method === 'GET') {
    let sql = `
      SELECT c.*, m.full_name as member_name
      FROM certificates c
      LEFT JOIN members m ON m.id = c.member_id
    `;
    const params: any[] = [];
    if (session.role === 'MEMBER') {
      sql += ' WHERE c.member_id = ?';
      params.push(session.member_id);
    }
    sql += ' ORDER BY c.issue_date DESC';
    const res = await db.prepare(sql).bind(...params).all();
    return jsonResponse({ certificates: res.results || [] });
  }

  if (path === '/api/certificates' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const b = await request.json() as any;
    const mid = String(b.memberId || '').toUpperCase();
    const title = b.title || 'Official Membership Certificate';
    const issueDate = b.issueDate || new Date().toISOString().slice(0, 10);
    const certNo = 'CRT-' + Date.now();
    const serial = 'SN-' + Math.floor(100000 + Math.random() * 900000);
    const hash = bufferToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(certNo + mid + issueDate)));
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO certificates (id, certificate_no, member_id, title, issue_date, serial_number, verification_hash, notes, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind('crt-' + crypto.randomUUID(), certNo, mid, title, issueDate, serial, hash, b.notes || null, session.username, now).run();

    await logAudit(db, session.user_id, session.username, 'ADMIN', 'CERTIFICATE_ISSUED', 'CERTIFICATE', certNo, `Issued certificate ${certNo} to ${mid}`, clientIp);
    return jsonResponse({ success: true, certificateNo: certNo }, 201);
  }

  if (path === '/api/documents' && method === 'GET') {
    let sql = 'SELECT * FROM documents';
    const params: any[] = [];
    if (session.role === 'MEMBER') {
      sql += ' WHERE member_id = ? OR member_id IS NULL';
      params.push(session.member_id);
    }
    sql += ' ORDER BY uploaded_at DESC';
    const res = await db.prepare(sql).bind(...params).all();
    return jsonResponse({ documents: res.results || [] });
  }

  if (path === '/api/documents' && method === 'POST') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const b = await request.json() as any;
    const docId = 'doc-' + crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO documents (id, title, category, member_id, file_url, file_type, file_size, uploaded_by, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(docId, b.title, b.category || 'GENERAL', b.memberId || null, b.fileUrl || '', b.fileType || 'PDF', b.fileSize || 0, session.username, now).run();
    return jsonResponse({ success: true, id: docId }, 201);
  }

  // ----------------------------------------------------------
  // SETTINGS (ORG CONFIG & FINANCIAL RULES)
  // ----------------------------------------------------------
  if (path === '/api/settings' && method === 'GET') {
    const org = await db.prepare("SELECT data FROM settings WHERE id = 'org_config'").first() as any;
    const fin = await db.prepare("SELECT data FROM settings WHERE id = 'financial_rules'").first() as any;

    let orgConfig: any = null;
    let financialRules: any = null;
    try { if (org?.data) orgConfig = JSON.parse(org.data); } catch { orgConfig = null; }
    try { if (fin?.data) financialRules = JSON.parse(fin.data); } catch { financialRules = null; }

    return jsonResponse({ orgConfig, financialRules });
  }

  if (path === '/api/settings/org' && method === 'PUT') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const body = await request.json();
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO settings (id, data, updated_at) VALUES ('org_config', ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).bind(JSON.stringify(body), now).run();

    await logAudit(db, session.user_id, session.username, 'ADMIN', 'SETTINGS_UPDATE', 'SETTINGS', 'org_config', 'Updated organization settings', clientIp);
    return jsonResponse({ success: true });
  }

  if (path === '/api/settings/financial-rules' && method === 'PUT') {
    if (session.role !== 'ADMIN') return jsonResponse({ error: 'Unauthorized.' }, 403);
    const body = await request.json();
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO settings (id, data, updated_at) VALUES ('financial_rules', ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).bind(JSON.stringify(body), now).run();

    await logAudit(db, session.user_id, session.username, 'ADMIN', 'SETTINGS_UPDATE', 'SETTINGS', 'financial_rules', 'Updated financial rules', clientIp);
    return jsonResponse({ success: true });
  }

  // ----------------------------------------------------------
  // 404 NOT FOUND FOR UNMATCHED /api/*
  // ----------------------------------------------------------
  return jsonResponse({ error: `Endpoint ${method} ${path} not found.` }, 404);
};