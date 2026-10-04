import { Router, Request, Response } from 'express';
import { db, getNextReceiptNo, postGeneralLedger, logAuditAction, createNotification } from './db.js';
import { authMiddleware, requireAdmin } from './auth.js';

export const NEPALI_MONTHS = [
  { no: 1, name: 'Baisakh' },
  { no: 2, name: 'Jestha' },
  { no: 3, name: 'Ashadh' },
  { no: 4, name: 'Shrawan' },
  { no: 5, name: 'Bhadra' },
  { no: 6, name: 'Ashwin' },
  { no: 7, name: 'Kartik' },
  { no: 8, name: 'Mangsir' },
  { no: 9, name: 'Poush' },
  { no: 10, name: 'Magh' },
  { no: 11, name: 'Falgun' },
  { no: 12, name: 'Chaitra' }
];

export const contributionsRouter = Router();

// List Contributions with filters
contributionsRouter.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { memberId, year, month } = req.query;

    let targetMemberId = memberId ? String(memberId).toUpperCase() : null;
    if (user.role === 'MEMBER') {
      if (!user.memberId) {
        return res.status(403).json({ error: 'Access denied. No member identity associated with this account.' });
      }
      targetMemberId = user.memberId;
    }

    let query = `
      SELECT c.*, m.full_name as member_name, m.mobile_phone
      FROM contributions c
      JOIN members m ON m.id = c.member_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (targetMemberId) {
      query += ` AND c.member_id = ?`;
      params.push(targetMemberId);
    }
    if (year) {
      query += ` AND c.year_bs = ?`;
      params.push(parseInt(String(year), 10));
    }
    if (month) {
      query += ` AND c.month_bs = ?`;
      params.push(parseInt(String(month), 10));
    }

    query += ` ORDER BY c.year_bs DESC, c.month_bs DESC, c.created_at DESC`;

    const contributions = db.prepare(query).all(...params);
    res.json({ contributions });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve contributions.' });
  }
});

// Matrix summary of contributions by year (Admin)
contributionsRouter.get('/matrix', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { year = '2081' } = req.query;
    const yearInt = parseInt(String(year), 10);

    const members = db.prepare("SELECT id, full_name, mobile_phone FROM members WHERE membership_status = 'ACTIVE' ORDER BY id ASC").all() as any[];
    const contributions = db.prepare('SELECT member_id, month_bs, amount, receipt_no, payment_date FROM contributions WHERE year_bs = ?').all(yearInt) as any[];

    const memberMap: Record<string, any> = {};
    for (const m of members) {
      memberMap[m.id] = {
        memberId: m.id,
        fullName: m.full_name,
        months: {},
        totalPaid: 0
      };
      for (let i = 1; i <= 12; i++) {
        memberMap[m.id].months[i] = null;
      }
    }

    for (const c of contributions) {
      if (memberMap[c.member_id]) {
        memberMap[c.member_id].months[c.month_bs] = {
          amount: c.amount,
          receiptNo: c.receipt_no,
          date: c.payment_date
        };
        memberMap[c.member_id].totalPaid += c.amount;
      }
    }

    res.json({
      year: yearInt,
      months: NEPALI_MONTHS,
      matrix: Object.values(memberMap)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to build contribution matrix.' });
  }
});

// Record Monthly Contribution (Admin)
contributionsRouter.post('/', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      memberId,
      yearBS,
      monthBS,
      amount,
      paymentMethod = 'CASH',
      paymentDate,
      cashBankAccountId,
      notes
    } = req.body;

    const numAmount = parseFloat(amount);
    const numYear = parseInt(yearBS, 10);
    const numMonth = parseInt(monthBS, 10);

    if (!memberId || isNaN(numAmount) || numAmount <= 0 || isNaN(numYear) || isNaN(numMonth) || numMonth < 1 || numMonth > 12) {
      return res.status(400).json({ error: 'Valid Member ID, Year, Month (1-12), and positive amount are required.' });
    }

    const cleanMemberId = String(memberId).toUpperCase();
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(cleanMemberId) as any;
    if (!member) {
      return res.status(404).json({ error: `Member ${cleanMemberId} not found.` });
    }

    // Check if contribution for this member, year, month already exists
    const existing = db.prepare('SELECT * FROM contributions WHERE member_id = ? AND year_bs = ? AND month_bs = ?').get(cleanMemberId, numYear, numMonth) as any;
    if (existing) {
      return res.status(409).json({
        error: `Contribution for ${member.full_name} for ${NEPALI_MONTHS[numMonth - 1].name} ${numYear} B.S. was already recorded (Receipt ${existing.receipt_no}).`
      });
    }

    const monthName = NEPALI_MONTHS[numMonth - 1].name;
    const receiptNo = getNextReceiptNo();
    const id = 'CON-' + Date.now();
    const date = paymentDate || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // 1. Insert Contribution
    db.prepare(`
      INSERT INTO contributions (id, receipt_no, member_id, year_bs, month_bs, month_name, amount, payment_method, payment_date, notes, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      receiptNo,
      cleanMemberId,
      numYear,
      numMonth,
      monthName,
      numAmount,
      paymentMethod,
      date,
      notes || null,
      user.username,
      now
    );

    // 2. Post to General Ledger & Cash/Bank
    const bankAcc = cashBankAccountId ? db.prepare('SELECT * FROM cash_bank_accounts WHERE id = ?').get(cashBankAccountId) as any : null;
    postGeneralLedger(date, receiptNo, bankAcc?.type === 'BANK' ? 'Bank Account' : 'Cash on Hand', 'ASSET', numAmount, 0, `Monthly contribution ${monthName} ${numYear} - ${member.full_name}`, 'CONTRIBUTION', id, user.username);
    postGeneralLedger(date, receiptNo, 'Member Equity Contributions', 'EQUITY', 0, numAmount, `Member contribution equity - ${member.full_name}`, 'CONTRIBUTION', id, user.username);

    if (bankAcc) {
      const newBankBal = Math.round((bankAcc.current_balance + numAmount) * 100) / 100;
      db.prepare('UPDATE cash_bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?').run(newBankBal, now, bankAcc.id);
      db.prepare(`
        INSERT INTO cash_bank_transactions (id, receipt_no, account_id, transaction_type, amount, balance_after, description, date, created_by, created_at)
        VALUES (?, ?, ?, 'CONTRIBUTION_INFLOW', ?, ?, ?, ?, ?, ?)
      `).run('CB-' + Date.now(), receiptNo, bankAcc.id, numAmount, newBankBal, `Contribution ${monthName} ${numYear} from ${member.full_name}`, date, user.username, now);
    }

    // 3. Notification
    createNotification(
      'MEMBER',
      'Monthly Contribution Received',
      `Your contribution of Rs. ${numAmount.toLocaleString()} for ${monthName} ${numYear} B.S. has been verified. Receipt No: ${receiptNo}.`,
      'PAYMENT',
      cleanMemberId
    );

    // 4. Audit Log
    logAuditAction(user.userId, user.username, 'ADMIN', 'CONTRIBUTION_RECORDED', 'CONTRIBUTION', id, `Recorded contribution of Rs. ${numAmount} for ${member.full_name} (${monthName} ${numYear}). Receipt ${receiptNo}.`);

    res.json({
      success: true,
      receiptNo,
      message: `Contribution recorded successfully. Receipt No: ${receiptNo}`
    });
  } catch (err: any) {
    console.error('Record contribution error:', err);
    res.status(500).json({ error: 'Failed to record contribution: ' + err.message });
  }
});
