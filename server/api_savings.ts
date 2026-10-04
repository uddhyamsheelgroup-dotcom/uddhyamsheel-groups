import { Router, Request, Response } from 'express';
import { db, getNextReceiptNo, postGeneralLedger, logAuditAction, createNotification } from './db.js';
import { authMiddleware, requireAdmin } from './auth.js';

export const savingsRouter = Router();

// Get Savings accounts and overall summary (Admin)
savingsRouter.get('/accounts', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const accounts = db.prepare(`
      SELECT s.*, m.full_name as member_name, m.mobile_phone, m.membership_status
      FROM savings_accounts s
      JOIN members m ON m.id = s.member_id
      ORDER BY s.member_id ASC
    `).all();

    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(balance), 0.0) as total_savings,
        COUNT(*) as total_accounts
      FROM savings_accounts
    `).get();

    res.json({ accounts, summary });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve savings accounts.' });
  }
});

// Get Savings Transactions (Admin or Member for their own account)
savingsRouter.get('/transactions', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { memberId, type, startDate, endDate } = req.query;

    let targetMemberId = memberId ? String(memberId).toUpperCase() : null;
    if (user.role === 'MEMBER') {
      if (!user.memberId) {
        return res.status(403).json({ error: 'Access denied. No member identity associated with this account.' });
      }
      targetMemberId = user.memberId;
    }

    let query = `
      SELECT t.*, m.full_name as member_name
      FROM savings_transactions t
      JOIN members m ON m.id = t.member_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (targetMemberId) {
      query += ` AND t.member_id = ?`;
      params.push(targetMemberId);
    }
    if (type && type !== 'ALL') {
      query += ` AND t.type = ?`;
      params.push(type);
    }
    if (startDate) {
      query += ` AND t.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND t.date <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY t.created_at DESC LIMIT 200`;

    const transactions = db.prepare(query).all(...params);
    res.json({ transactions });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
});

// Record Savings Transaction (Admin only)
savingsRouter.post('/transactions', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      memberId,
      type, // 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT' | 'INTEREST_CREDIT'
      amount,
      date,
      paymentMethod = 'CASH',
      cashBankAccountId,
      description
    } = req.body;

    const numAmount = parseFloat(amount);
    if (!memberId || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid Member ID and positive amount are required.' });
    }

    const cleanMemberId = String(memberId).toUpperCase();
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(cleanMemberId) as any;
    if (!member) {
      return res.status(404).json({ error: `Member ${cleanMemberId} not found.` });
    }

    const account = db.prepare('SELECT * FROM savings_accounts WHERE member_id = ?').get(cleanMemberId) as any;
    if (!account) {
      return res.status(404).json({ error: `Savings account for member ${cleanMemberId} not found.` });
    }

    const currentBalance = parseFloat(account.balance);
    let newBalance = currentBalance;

    if (type === 'WITHDRAWAL') {
      if (numAmount > currentBalance) {
        return res.status(400).json({
          error: `Insufficient savings balance. Current balance is Rs. ${currentBalance.toLocaleString()}, requested Rs. ${numAmount.toLocaleString()}.`
        });
      }
      newBalance = currentBalance - numAmount;
    } else {
      // DEPOSIT or ADJUSTMENT or INTEREST_CREDIT
      newBalance = currentBalance + numAmount;
    }

    newBalance = Math.round(newBalance * 100) / 100;
    const receiptNo = getNextReceiptNo();
    const txId = 'TX-' + Date.now();
    const txDate = date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // 1. Update Savings Account Balance
    db.prepare('UPDATE savings_accounts SET balance = ?, updated_at = ? WHERE id = ?').run(newBalance, now, account.id);

    // 2. Insert Savings Transaction
    db.prepare(`
      INSERT INTO savings_transactions (
        id, receipt_no, member_id, account_id, type, amount, balance_after,
        payment_method, description, created_by, date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      txId,
      receiptNo,
      cleanMemberId,
      account.id,
      type,
      numAmount,
      newBalance,
      paymentMethod,
      description || `Savings ${type.toLowerCase()} of Rs. ${numAmount}`,
      user.username,
      txDate,
      now
    );

    // 3. Post to General Ledger & update Cash/Bank
    const bankAcc = cashBankAccountId ? db.prepare('SELECT * FROM cash_bank_accounts WHERE id = ?').get(cashBankAccountId) as any : null;

    if (type === 'DEPOSIT') {
      // Debit Cash/Bank, Credit Savings Deposit Liability
      postGeneralLedger(txDate, receiptNo, bankAcc?.type === 'BANK' ? 'Bank Account' : 'Cash on Hand', 'ASSET', numAmount, 0, `Savings deposit - ${member.full_name} (${cleanMemberId})`, 'SAVINGS', txId, user.username);
      postGeneralLedger(txDate, receiptNo, 'Member Savings Liability', 'LIABILITY', 0, numAmount, `Savings deposit liability - ${member.full_name}`, 'SAVINGS', txId, user.username);

      if (bankAcc) {
        const newBankBal = Math.round((bankAcc.current_balance + numAmount) * 100) / 100;
        db.prepare('UPDATE cash_bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?').run(newBankBal, now, bankAcc.id);
        db.prepare(`
          INSERT INTO cash_bank_transactions (id, receipt_no, account_id, transaction_type, amount, balance_after, description, date, created_by, created_at)
          VALUES (?, ?, ?, 'SAVINGS_INFLOW', ?, ?, ?, ?, ?, ?)
        `).run('CB-' + Date.now(), receiptNo, bankAcc.id, numAmount, newBankBal, `Savings deposit from ${member.full_name}`, txDate, user.username, now);
      }
    } else if (type === 'WITHDRAWAL') {
      // Debit Savings Liability, Credit Cash/Bank
      postGeneralLedger(txDate, receiptNo, 'Member Savings Liability', 'LIABILITY', numAmount, 0, `Savings withdrawal - ${member.full_name} (${cleanMemberId})`, 'SAVINGS', txId, user.username);
      postGeneralLedger(txDate, receiptNo, bankAcc?.type === 'BANK' ? 'Bank Account' : 'Cash on Hand', 'ASSET', 0, numAmount, `Savings withdrawal payout - ${member.full_name}`, 'SAVINGS', txId, user.username);

      if (bankAcc) {
        const newBankBal = Math.round((bankAcc.current_balance - numAmount) * 100) / 100;
        db.prepare('UPDATE cash_bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?').run(newBankBal, now, bankAcc.id);
        db.prepare(`
          INSERT INTO cash_bank_transactions (id, receipt_no, account_id, transaction_type, amount, balance_after, description, date, created_by, created_at)
          VALUES (?, ?, ?, 'WITHDRAWAL', ?, ?, ?, ?, ?, ?)
        `).run('CB-' + Date.now(), receiptNo, bankAcc.id, numAmount, newBankBal, `Savings withdrawal by ${member.full_name}`, txDate, user.username, now);
      }
    }

    // 4. Notification
    createNotification(
      'MEMBER',
      `Savings ${type} Recorded`,
      `A savings ${type.toLowerCase()} of Rs. ${numAmount.toLocaleString()} has been posted to your account. New balance: Rs. ${newBalance.toLocaleString()}. Receipt No: ${receiptNo}.`,
      'PAYMENT',
      cleanMemberId
    );

    // 5. Audit Log
    logAuditAction(user.userId, user.username, 'ADMIN', 'SAVINGS_TRANSACTION', 'SAVINGS', txId, `Processed ${type} of Rs. ${numAmount} for ${member.full_name} (${cleanMemberId}). Receipt ${receiptNo}.`);

    res.json({
      success: true,
      receiptNo,
      balanceAfter: newBalance,
      message: `Transaction recorded. Receipt: ${receiptNo}`
    });
  } catch (err: any) {
    console.error('Record savings transaction error:', err);
    res.status(500).json({ error: 'Failed to record transaction: ' + err.message });
  }
});
