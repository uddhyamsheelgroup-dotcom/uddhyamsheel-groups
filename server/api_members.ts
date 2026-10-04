import { Router, Request, Response } from 'express';
import { db, getNextMemberId, getNextCertificateNo, hashPin, logAuditAction, createNotification } from './db.js';
import { authMiddleware, requireAdmin } from './auth.js';
import { validateServerNumericPin } from './pinValidation.js';

export const membersRouter = Router();

// List members with search, filter, sorting, pagination
membersRouter.get('/', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { search, status, type, page = '1', limit = '50' } = req.query;
    let query = `
      SELECT m.*, 
        COALESCE(s.balance, 0.0) as savings_balance,
        (SELECT COUNT(*) FROM loans l WHERE l.member_id = m.id AND l.status IN ('ACTIVE', 'DISBURSED')) as active_loans_count
      FROM members m
      LEFT JOIN savings_accounts s ON s.member_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (m.full_name LIKE ? OR m.id LIKE ? OR m.mobile_phone LIKE ? OR m.citizenship_no LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (status && status !== 'ALL') {
      query += ` AND m.membership_status = ?`;
      params.push(status);
    }

    if (type && type !== 'ALL') {
      query += ` AND m.membership_type = ?`;
      params.push(type);
    }

    query += ` ORDER BY m.id ASC`;

    const members = db.prepare(query).all(...params);
    res.json({ members });
  } catch (err: any) {
    console.error('List members error:', err);
    res.status(500).json({ error: 'Failed to retrieve members.' });
  }
});

// Get Authenticated Member Authoritative Financial Summary
membersRouter.get('/me/financial-summary', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'MEMBER' || !user.memberId) {
      return res.status(403).json({ error: 'Access denied. Member session required.' });
    }
    const memberId = user.memberId;

    // Savings balance
    const savingsAccount = db.prepare('SELECT balance FROM savings_accounts WHERE member_id = ?').get(memberId) as any;
    const totalSavings = savingsAccount ? savingsAccount.balance : 0.0;

    // Contributions total
    const contrib = db.prepare("SELECT COALESCE(SUM(amount), 0.0) as total FROM contributions WHERE member_id = ? AND status = 'PAID'").get(memberId) as any;
    const totalContributions = contrib ? contrib.total : 0.0;

    // Loan totals
    const loanRows = db.prepare('SELECT id, loan_amount, remaining_principal, status FROM loans WHERE member_id = ?').all(memberId) as any[];
    let totalLoanPrincipal = 0.0;
    let outstandingPrincipal = 0.0;
    for (const l of loanRows) {
      totalLoanPrincipal += l.loan_amount || 0.0;
      if (l.status === 'ACTIVE' || l.status === 'DISBURSED') {
        outstandingPrincipal += l.remaining_principal || 0.0;
      }
    }

    // Repayments total
    const rep = db.prepare(`
      SELECT 
        COALESCE(SUM(principal_amount), 0.0) as principal_paid,
        COALESCE(SUM(interest_amount), 0.0) as interest_paid,
        COALESCE(SUM(penalty_amount), 0.0) as penalty_paid,
        COALESCE(SUM(total_amount), 0.0) as total_payments
      FROM loan_repayments WHERE member_id = ?
    `).get(memberId) as any;

    const totalPrincipalPaid = rep ? rep.principal_paid : 0.0;
    const totalInterestPaid = rep ? rep.interest_paid : 0.0;
    const totalPenaltyPaid = rep ? rep.penalty_paid : 0.0;
    const totalLoanPayments = rep ? rep.total_payments : 0.0;

    res.json({
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
  } catch (err: any) {
    console.error('Financial summary error:', err);
    res.status(500).json({ error: 'Failed to calculate financial summary.' });
  }
});

// Dedicated Member Interest Paid History
membersRouter.get('/me/interest-history', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'MEMBER' || !user.memberId) {
      return res.status(403).json({ error: 'Access denied. Member session required.' });
    }
    const memberId = user.memberId;
    const { loanId } = req.query;

    let query = `
      SELECT 
        r.id,
        r.loan_id,
        l.id as loan_no,
        r.receipt_no,
        r.payment_date,
        r.total_amount,
        r.principal_amount,
        r.interest_amount,
        r.penalty_amount,
        r.remaining_principal_after as remaining_principal,
        r.payment_method,
        r.notes as remarks
      FROM loan_repayments r
      LEFT JOIN loans l ON r.loan_id = l.id
      WHERE r.member_id = ?
    `;
    const params: any[] = [memberId];

    if (loanId && String(loanId) !== 'ALL') {
      query += ` AND r.loan_id = ?`;
      params.push(loanId);
    }

    query += ` ORDER BY r.payment_date DESC, r.created_at DESC`;
    const repayments = db.prepare(query).all(...params) as any[];

    let totalInterestPaidToDate = 0.0;
    let thisYearInterest = 0.0;
    let thisMonthInterest = 0.0;
    const currentYearPrefix = '2083';

    for (const r of repayments) {
      totalInterestPaidToDate += r.interest_amount || 0.0;
      if (r.payment_date && String(r.payment_date).startsWith(currentYearPrefix)) {
        thisYearInterest += r.interest_amount || 0.0;
      }
    }

    res.json({
      memberId,
      totalInterestPaidToDate,
      thisYearInterest,
      thisMonthInterest,
      repayments
    });
  } catch (err: any) {
    console.error('Interest history error:', err);
    res.status(500).json({ error: 'Failed to retrieve interest history.' });
  }
});

// Get Single Member Details (Admin or the Member themselves)
membersRouter.get('/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const targetId = req.params.id.toUpperCase();

    // Security check: members can only view themselves
    if (user.role === 'MEMBER' && user.memberId !== targetId) {
      return res.status(403).json({ error: 'Access denied. You can only view your own records.' });
    }

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(targetId) as any;
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    // Financial summaries for this member
    const savingsAccount = db.prepare('SELECT * FROM savings_accounts WHERE member_id = ?').get(targetId) as any;
    const totalContributions = (db.prepare('SELECT COALESCE(SUM(amount), 0.0) as total FROM contributions WHERE member_id = ?').get(targetId) as any).total;
    const activeLoans = db.prepare("SELECT * FROM loans WHERE member_id = ? AND status IN ('ACTIVE', 'DISBURSED', 'APPROVED')").all(targetId);
    const loanSummary = db.prepare(`
      SELECT 
        COALESCE(SUM(loan_amount), 0.0) as total_borrowed,
        COALESCE(SUM(remaining_principal), 0.0) as total_outstanding,
        COALESCE(SUM(principal_paid), 0.0) as total_principal_paid,
        COALESCE(SUM(interest_paid), 0.0) as total_interest_paid
      FROM loans WHERE member_id = ?
    `).get(targetId) as any;

    const certificates = db.prepare('SELECT * FROM certificates WHERE member_id = ? ORDER BY issue_date DESC').all(targetId);
    const documents = db.prepare('SELECT * FROM documents WHERE member_id = ? ORDER BY upload_date DESC').all(targetId);

    // Omit sensitive hashes
    delete member.pin_hash;
    delete member.salt;

    res.json({
      member,
      savingsAccount: savingsAccount || { balance: 0.0, account_number: 'N/A' },
      totalContributions,
      loanSummary,
      activeLoans,
      certificates,
      documents
    });
  } catch (err: any) {
    console.error('Get member error:', err);
    res.status(500).json({ error: 'Failed to retrieve member details.' });
  }
});

// Create Member (Admin only)
membersRouter.post('/', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      fullName,
      photoUrl,
      dob,
      gender,
      citizenshipNo,
      address,
      mobilePhone,
      email,
      emergencyName,
      emergencyPhone,
      membershipType,
      membershipDate, // Original historical membership date
      initialPin = '123456',
      notes
    } = req.body;

    if (!fullName || !address || !mobilePhone || !membershipDate) {
      return res.status(400).json({ error: 'Full Name, Address, Mobile Phone, and Historical Membership Date are required.' });
    }

    const pinCheck = validateServerNumericPin(initialPin, 6, 'Initial Member PIN', true);
    if (!pinCheck.valid) {
      return res.status(400).json({ error: pinCheck.error });
    }

    const memberId = getNextMemberId();
    const { hash, salt } = hashPin(String(initialPin).trim());
    const now = new Date().toISOString();

    // 1. Insert Member
    db.prepare(`
      INSERT INTO members (
        id, full_name, photo_url, dob, gender, citizenship_no, address,
        mobile_phone, email, emergency_name, emergency_phone,
        membership_type, membership_date, account_status, membership_status,
        pin_hash, salt, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'ACTIVE', ?, ?, ?, ?, ?)
    `).run(
      memberId,
      fullName.trim(),
      photoUrl || null,
      dob || null,
      gender || 'Other',
      citizenshipNo ? String(citizenshipNo).trim() : null,
      address.trim(),
      mobilePhone.trim(),
      email ? String(email).trim() : null,
      emergencyName || null,
      emergencyPhone || null,
      membershipType || 'General Member',
      membershipDate.trim(),
      hash,
      salt,
      notes || null,
      now,
      now
    );

    // 2. Create Default Savings Account
    const savingsAccId = `SAV-${memberId}`;
    db.prepare(`
      INSERT INTO savings_accounts (id, member_id, account_number, balance, created_at, updated_at)
      VALUES (?, ?, ?, 0.0, ?, ?)
    `).run(savingsAccId, memberId, `SA-${memberId}`, now, now);

    // 3. Automatically Generate Official Membership Certificate
    const certNo = getNextCertificateNo();
    const certId = 'CERT-' + Date.now();
    db.prepare(`
      INSERT INTO certificates (id, certificate_no, member_id, type, title, issue_date, historical_membership_date, signatory, status, created_at)
      VALUES (?, ?, ?, 'MEMBERSHIP_CERTIFICATE', 'Official Membership Certificate', ?, ?, 'Chairperson / Authorized Signatory', 'ISSUED', ?)
    `).run(certId, certNo, memberId, now.split('T')[0], membershipDate.trim(), now);

    // 4. Welcome Notification
    createNotification(
      'MEMBER',
      'Welcome to Uddhyamsheel Group',
      `Welcome ${fullName}! Your official member ID is ${memberId}. Your membership certificate (${certNo}) has been issued.`,
      'CERTIFICATE',
      memberId
    );

    // 5. Audit Log
    logAuditAction(
      user.userId,
      user.username,
      'ADMIN',
      'MEMBER_CREATED',
      'MEMBER',
      memberId,
      `Registered member ${fullName} (${memberId}) with historical join date ${membershipDate}. Certificate ${certNo} generated.`
    );

    res.status(201).json({
      success: true,
      memberId,
      certificateNo: certNo,
      message: `Member ${fullName} (${memberId}) registered successfully.`
    });
  } catch (err: any) {
    console.error('Create member error:', err);
    res.status(500).json({ error: 'Failed to create member: ' + err.message });
  }
});

// Update Member (Admin only)
membersRouter.put('/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const memberId = req.params.id.toUpperCase();
    const {
      fullName,
      photoUrl,
      dob,
      gender,
      citizenshipNo,
      address,
      mobilePhone,
      email,
      emergencyName,
      emergencyPhone,
      membershipType,
      membershipDate,
      accountStatus,
      notes
    } = req.body;

    const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE members SET
        full_name = ?,
        photo_url = ?,
        dob = ?,
        gender = ?,
        citizenship_no = ?,
        address = ?,
        mobile_phone = ?,
        email = ?,
        emergency_name = ?,
        emergency_phone = ?,
        membership_type = ?,
        membership_date = ?,
        account_status = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      fullName || existing.full_name,
      photoUrl !== undefined ? photoUrl : existing.photo_url,
      dob || existing.dob,
      gender || existing.gender,
      citizenshipNo !== undefined ? citizenshipNo : existing.citizenship_no,
      address || existing.address,
      mobilePhone || existing.mobile_phone,
      email !== undefined ? email : existing.email,
      emergencyName || existing.emergency_name,
      emergencyPhone || existing.emergency_phone,
      membershipType || existing.membership_type,
      membershipDate || existing.membership_date,
      accountStatus || existing.account_status,
      notes !== undefined ? notes : existing.notes,
      now,
      memberId
    );

    logAuditAction(
      user.userId,
      user.username,
      'ADMIN',
      'MEMBER_UPDATED',
      'MEMBER',
      memberId,
      `Updated member profile for ${existing.full_name} (${memberId})`
    );

    res.json({ success: true, message: 'Member profile updated successfully.' });
  } catch (err: any) {
    console.error('Update member error:', err);
    res.status(500).json({ error: 'Failed to update member.' });
  }
});

// Admin Reset Member PIN
membersRouter.post('/:id/reset-pin', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const memberId = req.params.id.toUpperCase();
    const { newPin } = req.body;

    const pinCheck = validateServerNumericPin(newPin, 6, 'New Member PIN', true);
    if (!pinCheck.valid) {
      return res.status(400).json({ error: pinCheck.error });
    }

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as any;
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const { hash, salt } = hashPin(String(newPin).trim());
    db.prepare('UPDATE members SET pin_hash = ?, salt = ?, updated_at = ? WHERE id = ?').run(hash, salt, new Date().toISOString(), memberId);

    // Invalidate any active member sessions upon PIN reset
    db.prepare('DELETE FROM sessions WHERE member_id = ?').run(memberId);

    logAuditAction(user.userId, user.username, 'ADMIN', 'PIN_RESET', 'MEMBER', memberId, `Reset portal PIN for member ${member.full_name} (${memberId})`);

    res.json({ success: true, message: `PIN for member ${memberId} has been successfully reset.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset member PIN.' });
  }
});

// Archive Member
membersRouter.post('/:id/archive', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const memberId = req.params.id.toUpperCase();

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as any;
    if (!member) return res.status(404).json({ error: 'Member not found.' });

    db.prepare("UPDATE members SET membership_status = 'ARCHIVED', account_status = 'INACTIVE', updated_at = ? WHERE id = ?").run(new Date().toISOString(), memberId);

    logAuditAction(user.userId, user.username, 'ADMIN', 'MEMBER_ARCHIVED', 'MEMBER', memberId, `Archived member ${member.full_name} (${memberId})`);
    res.json({ success: true, message: `Member ${memberId} has been archived.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to archive member.' });
  }
});

// Restore Member
membersRouter.post('/:id/restore', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const memberId = req.params.id.toUpperCase();

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as any;
    if (!member) return res.status(404).json({ error: 'Member not found.' });

    db.prepare("UPDATE members SET membership_status = 'ACTIVE', account_status = 'ACTIVE', updated_at = ? WHERE id = ?").run(new Date().toISOString(), memberId);

    logAuditAction(user.userId, user.username, 'ADMIN', 'MEMBER_RESTORED', 'MEMBER', memberId, `Restored member ${member.full_name} (${memberId})`);
    res.json({ success: true, message: `Member ${memberId} has been restored to active status.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to restore member.' });
  }
});

// Permanent Member Deletion (Guarded by strict historical records check!)
membersRouter.delete('/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const memberId = req.params.id.toUpperCase();
    const { confirmId } = req.body;

    if (confirmId !== memberId) {
      return res.status(400).json({ error: `Confirmation failed. You must type "${memberId}" to confirm permanent deletion.` });
    }

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as any;
    if (!member) return res.status(404).json({ error: 'Member not found.' });

    // Check protected financial and historical records
    const savingsTxCount = (db.prepare('SELECT COUNT(*) as c FROM savings_transactions WHERE member_id = ?').get(memberId) as any).c;
    const contributionsCount = (db.prepare('SELECT COUNT(*) as c FROM contributions WHERE member_id = ?').get(memberId) as any).c;
    const loansCount = (db.prepare('SELECT COUNT(*) as c FROM loans WHERE member_id = ?').get(memberId) as any).c;
    const repaymentsCount = (db.prepare('SELECT COUNT(*) as c FROM loan_repayments WHERE member_id = ?').get(memberId) as any).c;
    const docsCount = (db.prepare('SELECT COUNT(*) as c FROM documents WHERE member_id = ?').get(memberId) as any).c;

    const reasons: string[] = [];
    if (savingsTxCount > 0) reasons.push(`${savingsTxCount} savings transaction(s)`);
    if (contributionsCount > 0) reasons.push(`${contributionsCount} contribution payment(s)`);
    if (loansCount > 0) reasons.push(`${loansCount} loan record(s)`);
    if (repaymentsCount > 0) reasons.push(`${repaymentsCount} repayment record(s)`);
    if (docsCount > 0) reasons.push(`${docsCount} uploaded document(s)`);

    if (reasons.length > 0) {
      return res.status(409).json({
        error: `Cannot permanently delete member ${memberId}. Protected financial records exist: ${reasons.join(', ')}. Please use ARCHIVE instead to preserve cooperative audit compliance.`
      });
    }

    // Clean up empty savings account, certificates, notifications for this member
    db.prepare('DELETE FROM certificates WHERE member_id = ?').run(memberId);
    db.prepare('DELETE FROM savings_accounts WHERE member_id = ?').run(memberId);
    db.prepare('DELETE FROM notifications WHERE member_id = ?').run(memberId);
    db.prepare('DELETE FROM members WHERE id = ?').run(memberId);

    logAuditAction(user.userId, user.username, 'ADMIN', 'MEMBER_DELETED', 'MEMBER', memberId, `Permanently deleted member ${member.full_name} (${memberId}) after verifying zero financial records.`);

    res.json({ success: true, message: `Member ${memberId} has been permanently deleted.` });
  } catch (err: any) {
    console.error('Delete member error:', err);
    res.status(500).json({ error: 'Failed to delete member: ' + err.message });
  }
});
