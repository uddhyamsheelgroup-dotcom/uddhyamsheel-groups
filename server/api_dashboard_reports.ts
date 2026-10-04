import { Router, Request, Response } from 'express';
import { db, getNextDocumentId, getNextCertificateNo, logAuditAction, createNotification } from './db.js';
import { authMiddleware, requireAdmin } from './auth.js';

export const dashboardReportsRouter = Router();

// ================= ADMIN DASHBOARD SUMMARY =================
dashboardReportsRouter.get('/dashboard-summary', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const memberStats = db.prepare(`
      SELECT 
        COUNT(*) as total_members,
        COALESCE(SUM(CASE WHEN membership_status = 'ACTIVE' AND account_status = 'ACTIVE' THEN 1 ELSE 0 END), 0) as active_members
      FROM members
    `).get() as any;

    const savingsStats = db.prepare('SELECT COALESCE(SUM(balance), 0.0) as total_savings FROM savings_accounts').get() as any;
    const contributionStats = db.prepare('SELECT COALESCE(SUM(amount), 0.0) as total_contributions FROM contributions').get() as any;

    const loanStats = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status IN ('ACTIVE', 'APPROVED', 'DISBURSED') THEN remaining_principal ELSE 0 END), 0.0) as outstanding_loans,
        COALESCE(SUM(interest_paid), 0.0) as total_loan_interest,
        COUNT(CASE WHEN status IN ('ACTIVE', 'APPROVED', 'DISBURSED') THEN 1 END) as active_loan_count
      FROM loans
    `).get() as any;

    const cashBankStats = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'CASH' THEN current_balance ELSE 0 END), 0.0) as cash_balance,
        COALESCE(SUM(CASE WHEN type = 'BANK' THEN current_balance ELSE 0 END), 0.0) as bank_balance
      FROM cash_bank_accounts
    `).get() as any;

    const investmentStats = db.prepare("SELECT COALESCE(SUM(amount), 0.0) as total_investments FROM investments WHERE status = 'ACTIVE'").get() as any;

    const assetLiabStats = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'ASSET' THEN current_value ELSE 0 END), 0.0) as registered_assets,
        COALESCE(SUM(CASE WHEN type = 'LIABILITY' THEN current_value ELSE 0 END), 0.0) as registered_liabilities
      FROM assets_liabilities
    `).get() as any;

    // Total Financial Assets = Cash + Bank + Loans Outstanding + Investments + Registered Assets
    const totalAssets = Math.round((cashBankStats.cash_balance + cashBankStats.bank_balance + loanStats.outstanding_loans + investmentStats.total_investments + assetLiabStats.registered_assets) * 100) / 100;
    // Total Liabilities = Member Savings Liability + Registered Liabilities
    const totalLiabilities = Math.round((savingsStats.total_savings + assetLiabStats.registered_liabilities) * 100) / 100;
    // Net Position
    const netPosition = Math.round((totalAssets - totalLiabilities) * 100) / 100;

    // Recent 10 transactions
    const recentSavings = db.prepare(`
      SELECT t.id, t.receipt_no, t.date, t.amount, t.type, m.full_name as member_name, 'SAVINGS' as category
      FROM savings_transactions t
      JOIN members m ON m.id = t.member_id
      ORDER BY t.created_at DESC LIMIT 5
    `).all() as any[];

    const recentContributions = db.prepare(`
      SELECT c.id, c.receipt_no, c.payment_date as date, c.amount, ('Contribution ' || c.month_name || ' ' || c.year_bs) as type, m.full_name as member_name, 'CONTRIBUTION' as category
      FROM contributions c
      JOIN members m ON m.id = c.member_id
      ORDER BY c.created_at DESC LIMIT 5
    `).all() as any[];

    const recentRepayments = db.prepare(`
      SELECT r.id, r.receipt_no, r.payment_date as date, r.total_amount as amount, ('Loan Repayment ' || r.loan_id) as type, m.full_name as member_name, 'LOAN_REPAYMENT' as category
      FROM loan_repayments r
      JOIN members m ON m.id = r.member_id
      ORDER BY r.created_at DESC LIMIT 5
    `).all() as any[];

    const recentActivities = [...recentSavings, ...recentContributions, ...recentRepayments]
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 10);

    // Contribution trends by year
    const contributionsByMonth = db.prepare(`
      SELECT month_bs, month_name, COALESCE(SUM(amount), 0.0) as total
      FROM contributions
      GROUP BY month_bs, month_name
      ORDER BY month_bs ASC
    `).all();

    res.json({
      summary: {
        totalMembers: memberStats.total_members,
        activeMembers: memberStats.active_members,
        totalSavings: savingsStats.total_savings,
        totalContributions: contributionStats.total_contributions,
        totalCollections: Math.round((savingsStats.total_savings + contributionStats.total_contributions) * 100) / 100,
        outstandingLoans: loanStats.outstanding_loans,
        totalLoanInterest: loanStats.total_loan_interest,
        activeLoanCount: loanStats.active_loan_count,
        cashBalance: cashBankStats.cash_balance,
        bankBalance: cashBankStats.bank_balance,
        investments: investmentStats.total_investments,
        totalAssets,
        totalLiabilities,
        netPosition
      },
      recentActivities,
      contributionsByMonth
    });
  } catch (err: any) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Failed to build dashboard summary.' });
  }
});

// ================= MEMBER STATEMENT GENERATOR =================
dashboardReportsRouter.get('/member-statement/:memberId', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const memberId = req.params.memberId.toUpperCase();

    if (user.role === 'MEMBER' && (!user.memberId || user.memberId !== memberId)) {
      return res.status(403).json({ error: 'Access denied. You can only view your own financial statements.' });
    }

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as any;
    if (!member) return res.status(404).json({ error: 'Member not found.' });

    const savingsAccount = db.prepare('SELECT * FROM savings_accounts WHERE member_id = ?').get(memberId) as any;
    const savingsTx = db.prepare('SELECT * FROM savings_transactions WHERE member_id = ? ORDER BY date ASC, created_at ASC').all(memberId);
    const contributions = db.prepare('SELECT * FROM contributions WHERE member_id = ? ORDER BY year_bs ASC, month_bs ASC').all(memberId);
    const loans = db.prepare('SELECT * FROM loans WHERE member_id = ? ORDER BY created_at ASC').all(memberId);
    const repayments = db.prepare('SELECT * FROM loan_repayments WHERE member_id = ? ORDER BY payment_date ASC, created_at ASC').all(memberId);

    const totalContributions = contributions.reduce((sum: number, c: any) => sum + c.amount, 0);
    const totalDeposits = savingsTx.filter((t: any) => t.type !== 'WITHDRAWAL').reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalWithdrawals = savingsTx.filter((t: any) => t.type === 'WITHDRAWAL').reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalBorrowed = loans.reduce((sum: number, l: any) => sum + l.loan_amount, 0);
    const totalRepaidPrincipal = repayments.reduce((sum: number, r: any) => sum + r.principal_amount, 0);
    const totalRepaidInterest = repayments.reduce((sum: number, r: any) => sum + r.interest_amount, 0);
    const currentLoanOutstanding = loans.filter((l: any) => l.status !== 'CLEARED').reduce((sum: number, l: any) => sum + l.remaining_principal, 0);

    res.json({
      member: {
        id: member.id,
        fullName: member.full_name,
        address: member.address,
        mobilePhone: member.mobile_phone,
        membershipDate: member.membership_date,
        membershipType: member.membership_type,
        accountStatus: member.account_status
      },
      savingsAccount: savingsAccount || { balance: 0.0, account_number: 'N/A' },
      totals: {
        currentSavingsBalance: savingsAccount?.balance || 0.0,
        totalContributions,
        totalDeposits,
        totalWithdrawals,
        totalBorrowed,
        totalRepaidPrincipal,
        totalRepaidInterest,
        currentLoanOutstanding
      },
      savingsTx,
      contributions,
      loans,
      repayments
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate member statement.' });
  }
});

// ================= DOCUMENTS MANAGEMENT =================
dashboardReportsRouter.get('/documents', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { memberId } = req.query;

    let targetMemberId = memberId ? String(memberId).toUpperCase() : null;
    if (user.role === 'MEMBER') {
      if (!user.memberId) {
        return res.status(403).json({ error: 'Access denied. No member identity associated with this account.' });
      }
      targetMemberId = user.memberId;
    }

    let query = `
      SELECT d.*, m.full_name as member_name
      FROM documents d
      JOIN members m ON m.id = d.member_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (targetMemberId) {
      query += ' AND d.member_id = ?';
      params.push(targetMemberId);
    }
    query += ' ORDER BY d.upload_date DESC';

    const documents = db.prepare(query).all(...params);
    res.json({ documents });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list documents.' });
  }
});

dashboardReportsRouter.post('/documents', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { memberId, documentType, title, fileUrl, fileName, fileSize, mimeType, notes } = req.body;

    if (!memberId || !title || !fileUrl) {
      return res.status(400).json({ error: 'Member ID, Title, and File are required.' });
    }

    const cleanMemberId = String(memberId).toUpperCase();
    const member = db.prepare('SELECT full_name FROM members WHERE id = ?').get(cleanMemberId) as any;
    if (!member) return res.status(404).json({ error: 'Member not found.' });

    const docId = getNextDocumentId();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO documents (
        id, member_id, document_type, title, file_url, file_name, file_size, mime_type, upload_date, uploaded_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      cleanMemberId,
      documentType || 'OTHER',
      title.trim(),
      fileUrl,
      fileName || 'document.pdf',
      fileSize || 0,
      mimeType || 'application/pdf',
      now.split('T')[0],
      user.username,
      notes || null
    );

    createNotification('MEMBER', 'New Document Uploaded', `A new official document "${title}" has been uploaded to your profile by administration.`, 'INFO', cleanMemberId);
    logAuditAction(user.userId, user.username, 'ADMIN', 'DOCUMENT_UPLOADED', 'DOCUMENT', docId, `Uploaded ${title} for ${member.full_name} (${cleanMemberId})`);

    res.json({ success: true, docId, message: 'Document uploaded successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to upload document: ' + err.message });
  }
});

// ================= CERTIFICATES =================
dashboardReportsRouter.get('/certificates', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { memberId } = req.query;

    let targetMemberId = memberId ? String(memberId).toUpperCase() : null;
    if (user.role === 'MEMBER') {
      if (!user.memberId) {
        return res.status(403).json({ error: 'Access denied. No member identity associated with this account.' });
      }
      targetMemberId = user.memberId;
    }

    let query = `
      SELECT c.*, m.full_name as member_name, m.address as member_address, m.citizenship_no
      FROM certificates c
      JOIN members m ON m.id = c.member_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (targetMemberId) {
      query += ' AND c.member_id = ?';
      params.push(targetMemberId);
    }
    query += ' ORDER BY c.created_at DESC';

    const certificates = db.prepare(query).all(...params);
    res.json({ certificates });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve certificates.' });
  }
});

// ================= NOTIFICATIONS =================
dashboardReportsRouter.get('/notifications', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let query = '';
    let params: any[] = [];

    if (user.role === 'MEMBER') {
      query = "SELECT * FROM notifications WHERE recipient_type = 'ALL' OR member_id = ? ORDER BY created_at DESC LIMIT 50";
      params = [user.memberId];
    } else {
      query = "SELECT * FROM notifications WHERE recipient_type IN ('ALL', 'ADMIN') OR member_id IS NOT NULL ORDER BY created_at DESC LIMIT 100";
    }

    const notifications = db.prepare(query).all(...params);
    res.json({ notifications });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get notifications.' });
  }
});

dashboardReportsRouter.post('/notifications/broadcast', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, message, type = 'INFO', recipientType = 'ALL', memberId } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    createNotification(recipientType, title, message, type, memberId || undefined);
    logAuditAction(user.userId, user.username, 'ADMIN', 'NOTIFICATION_SENT', 'NOTIFICATION', null, `Sent broadcast notification: ${title}`);

    res.json({ success: true, message: 'Notification broadcasted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to send notification.' });
  }
});

// ================= AUDIT LOGS =================
dashboardReportsRouter.get('/audit-logs', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { action, entity, search, limit = '100' } = req.query;
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (action && action !== 'ALL') {
      query += ' AND action = ?';
      params.push(action);
    }
    if (entity && entity !== 'ALL') {
      query += ' AND entity = ?';
      params.push(entity);
    }
    if (search) {
      query += ' AND (description LIKE ? OR user_name LIKE ? OR entity_id LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY timestamp DESC LIMIT ' + Math.min(parseInt(String(limit), 10) || 100, 500);

    const logs = db.prepare(query).all(...params);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

// ================= SYSTEM & ORG SETTINGS =================
dashboardReportsRouter.get('/settings', authMiddleware, (req: Request, res: Response) => {
  try {
    const org = db.prepare('SELECT data FROM settings WHERE id = ?').get('org_config') as any;
    const fin = db.prepare('SELECT data FROM settings WHERE id = ?').get('financial_rules') as any;

    res.json({
      orgConfig: org ? JSON.parse(org.data) : null,
      financialRules: fin ? JSON.parse(fin.data) : null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
});

dashboardReportsRouter.put('/settings', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { orgConfig, financialRules } = req.body;
    const now = new Date().toISOString();

    if (orgConfig) {
      db.prepare('INSERT OR REPLACE INTO settings (id, data, updated_at) VALUES (?, ?, ?)').run('org_config', JSON.stringify(orgConfig), now);
    }
    if (financialRules) {
      db.prepare('INSERT OR REPLACE INTO settings (id, data, updated_at) VALUES (?, ?, ?)').run('financial_rules', JSON.stringify(financialRules), now);
    }

    logAuditAction(user.userId, user.username, 'ADMIN', 'SETTINGS_UPDATED', 'SETTINGS', 'SYSTEM', 'Administrator updated organization profile and financial parameters.');

    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save settings: ' + err.message });
  }
});
