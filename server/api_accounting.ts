import { Router, Request, Response } from 'express';
import { db, getNextInvestmentId, getNextAssetLiabilityId, postGeneralLedger, logAuditAction } from './db.js';
import { authMiddleware, requireAdmin } from './auth.js';

export const accountingRouter = Router();

// ================= CASH & BANK =================
accountingRouter.get('/cash-bank', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const accounts = db.prepare('SELECT * FROM cash_bank_accounts ORDER BY type ASC, account_name ASC').all();
    const transactions = db.prepare(`
      SELECT t.*, a.account_name, a.type as account_type
      FROM cash_bank_transactions t
      JOIN cash_bank_accounts a ON a.id = t.account_id
      ORDER BY t.created_at DESC LIMIT 100
    `).all();

    const totals = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'CASH' THEN current_balance ELSE 0 END), 0.0) as total_cash,
        COALESCE(SUM(CASE WHEN type = 'BANK' THEN current_balance ELSE 0 END), 0.0) as total_bank
      FROM cash_bank_accounts
    `).get() as any;

    res.json({ accounts, transactions, totals });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve cash and bank data.' });
  }
});

// Transfer between accounts (e.g. Cash to Bank or Bank to Bank)
accountingRouter.post('/cash-bank/transfer', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { fromAccountId, toAccountId, amount, date, description } = req.body;

    const numAmount = parseFloat(amount);
    if (!fromAccountId || !toAccountId || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid source, destination, and positive amount are required.' });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({ error: 'Source and destination accounts must be different.' });
    }

    const fromAcc = db.prepare('SELECT * FROM cash_bank_accounts WHERE id = ?').get(fromAccountId) as any;
    const toAcc = db.prepare('SELECT * FROM cash_bank_accounts WHERE id = ?').get(toAccountId) as any;

    if (!fromAcc || !toAcc) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (fromAcc.current_balance < numAmount) {
      return res.status(400).json({ error: `Insufficient funds in ${fromAcc.account_name}. Available: Rs. ${fromAcc.current_balance.toLocaleString()}` });
    }

    const newFromBal = Math.round((fromAcc.current_balance - numAmount) * 100) / 100;
    const newToBal = Math.round((toAcc.current_balance + numAmount) * 100) / 100;
    const now = new Date().toISOString();
    const tDate = date || now.split('T')[0];
    const refNo = 'TRF-' + Date.now();

    db.prepare('UPDATE cash_bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?').run(newFromBal, now, fromAcc.id);
    db.prepare('UPDATE cash_bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?').run(newToBal, now, toAcc.id);

    db.prepare(`
      INSERT INTO cash_bank_transactions (id, receipt_no, account_id, transaction_type, amount, balance_after, reference_account_id, description, date, created_by, created_at)
      VALUES (?, ?, ?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?, ?)
    `).run('CB-' + Date.now() + '-1', refNo, fromAcc.id, numAmount, newFromBal, toAcc.id, description || `Transfer to ${toAcc.account_name}`, tDate, user.username, now);

    db.prepare(`
      INSERT INTO cash_bank_transactions (id, receipt_no, account_id, transaction_type, amount, balance_after, reference_account_id, description, date, created_by, created_at)
      VALUES (?, ?, ?, 'TRANSFER_IN', ?, ?, ?, ?, ?, ?, ?)
    `).run('CB-' + Date.now() + '-2', refNo, toAcc.id, numAmount, newToBal, fromAcc.id, description || `Transfer from ${fromAcc.account_name}`, tDate, user.username, now);

    postGeneralLedger(tDate, refNo, toAcc.type === 'BANK' ? 'Bank Account' : 'Cash on Hand', 'ASSET', numAmount, 0, `Transfer from ${fromAcc.account_name} to ${toAcc.account_name}`, 'TRANSFER', refNo, user.username);
    postGeneralLedger(tDate, refNo, fromAcc.type === 'BANK' ? 'Bank Account' : 'Cash on Hand', 'ASSET', 0, numAmount, `Transfer from ${fromAcc.account_name} to ${toAcc.account_name}`, 'TRANSFER', refNo, user.username);

    logAuditAction(user.userId, user.username, 'ADMIN', 'FUND_TRANSFER', 'CASH_BANK', refNo, `Transferred Rs. ${numAmount} from ${fromAcc.account_name} to ${toAcc.account_name}`);

    res.json({ success: true, message: 'Transfer completed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Transfer failed: ' + err.message });
  }
});

// ================= GENERAL LEDGER =================
accountingRouter.get('/general-ledger', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const { startDate, endDate, account } = req.query;
    let query = 'SELECT * FROM general_ledger WHERE 1=1';
    const params: any[] = [];

    if (startDate) {
      query += ' AND transaction_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND transaction_date <= ?';
      params.push(endDate);
    }
    if (account && account !== 'ALL') {
      query += ' AND account_name = ?';
      params.push(account);
    }

    query += ' ORDER BY transaction_date DESC, created_at DESC LIMIT 500';

    const entries = db.prepare(query).all(...params);
    const totals = db.prepare(`
      SELECT 
        COALESCE(SUM(debit), 0.0) as total_debit,
        COALESCE(SUM(credit), 0.0) as total_credit
      FROM general_ledger
    `).get();

    res.json({ entries, totals });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve ledger.' });
  }
});

// ================= INVESTMENTS =================
accountingRouter.get('/investments', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const investments = db.prepare('SELECT * FROM investments ORDER BY investment_date DESC').all();
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0.0) as total_invested,
        COALESCE(SUM(actual_return_amount), 0.0) as total_returns_received,
        COUNT(*) as total_count
      FROM investments WHERE status = 'ACTIVE'
    `).get();

    res.json({ investments, summary });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve investments.' });
  }
});

accountingRouter.post('/investments', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { investmentType, institutionName, amount, investmentDate, expectedReturnRate, maturityDate, notes } = req.body;

    const numAmount = parseFloat(amount);
    if (!institutionName || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Institution Name and positive Amount are required.' });
    }

    const id = getNextInvestmentId();
    const now = new Date().toISOString();
    const invDate = investmentDate || now.split('T')[0];
    const rate = parseFloat(expectedReturnRate) || 0.0;
    const expectedReturn = Math.round((numAmount * (rate / 100)) * 100) / 100;

    db.prepare(`
      INSERT INTO investments (
        id, investment_type, institution_name, amount, investment_date,
        expected_return_rate, expected_return_amount, maturity_date, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
    `).run(id, investmentType || 'FIXED_DEPOSIT', institutionName.trim(), numAmount, invDate, rate, expectedReturn, maturityDate || null, notes || null, now, now);

    postGeneralLedger(invDate, id, 'Investments (Assets)', 'ASSET', numAmount, 0, `Investment in ${institutionName} (${id})`, 'INVESTMENT', id, user.username);
    postGeneralLedger(invDate, id, 'Cash on Hand', 'ASSET', 0, numAmount, `Investment payout for ${institutionName}`, 'INVESTMENT', id, user.username);

    logAuditAction(user.userId, user.username, 'ADMIN', 'INVESTMENT_CREATED', 'INVESTMENT', id, `Created investment ${id} of Rs. ${numAmount} in ${institutionName}`);

    res.json({ success: true, id, message: 'Investment recorded.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record investment: ' + err.message });
  }
});

// ================= ASSETS & LIABILITIES =================
accountingRouter.get('/assets-liabilities', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const records = db.prepare('SELECT * FROM assets_liabilities ORDER BY type ASC, acquisition_date DESC').all();
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'ASSET' THEN current_value ELSE 0 END), 0.0) as total_assets,
        COALESCE(SUM(CASE WHEN type = 'LIABILITY' THEN current_value ELSE 0 END), 0.0) as total_liabilities
      FROM assets_liabilities
    `).get() as any;

    const netPosition = Math.round((summary.total_assets - summary.total_liabilities) * 100) / 100;

    res.json({ records, summary: { ...summary, netPosition } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve assets and liabilities.' });
  }
});

accountingRouter.post('/assets-liabilities', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { type, title, category, acquisitionDate, originalAmount, currentValue, dueDate, depreciationRate, notes } = req.body;

    if (!type || !title || !originalAmount) {
      return res.status(400).json({ error: 'Type (ASSET/LIABILITY), Title, and Amount are required.' });
    }

    const numOrig = parseFloat(originalAmount);
    const numCurr = currentValue !== undefined ? parseFloat(currentValue) : numOrig;
    const id = getNextAssetLiabilityId(type === 'LIABILITY' ? 'LIABILITY' : 'ASSET');
    const now = new Date().toISOString();
    const date = acquisitionDate || now.split('T')[0];

    db.prepare(`
      INSERT INTO assets_liabilities (
        id, type, title, category, acquisition_date, original_amount, current_value, due_date, depreciation_rate, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      type,
      title.trim(),
      category || 'General',
      date,
      numOrig,
      numCurr,
      dueDate || null,
      depreciationRate ? parseFloat(depreciationRate) : null,
      notes || null,
      now,
      now
    );

    logAuditAction(user.userId, user.username, 'ADMIN', `${type}_RECORDED`, type, id, `Recorded ${type.toLowerCase()} ${title} (${id}) valued at Rs. ${numCurr}`);

    res.json({ success: true, id, message: `${type} recorded successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record asset/liability: ' + err.message });
  }
});
