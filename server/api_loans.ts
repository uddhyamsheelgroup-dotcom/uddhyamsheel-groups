import { Router, Request, Response } from 'express';
import { db, getNextLoanId, getNextReceiptNo, postGeneralLedger, logAuditAction, createNotification } from './db.js';
import { authMiddleware, requireAdmin } from './auth.js';

export const loansRouter = Router();

// List Loans with filters
loansRouter.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { memberId, status } = req.query;

    let targetMemberId = memberId ? String(memberId).toUpperCase() : null;
    if (user.role === 'MEMBER') {
      if (!user.memberId) {
        return res.status(403).json({ error: 'Access denied. No member identity associated with this account.' });
      }
      targetMemberId = user.memberId;
    }

    let query = `
      SELECT l.*, m.full_name as member_name, m.mobile_phone
      FROM loans l
      JOIN members m ON m.id = l.member_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (targetMemberId) {
      query += ` AND l.member_id = ?`;
      params.push(targetMemberId);
    }
    if (status && status !== 'ALL') {
      query += ` AND l.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY l.created_at DESC`;

    const loans = db.prepare(query).all(...params);
    res.json({ loans });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve loans.' });
  }
});

// Get Single Loan with its complete Repayments history
loansRouter.get('/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const loanId = req.params.id;

    const loan = db.prepare(`
      SELECT l.*, m.full_name as member_name, m.mobile_phone, m.address as member_address
      FROM loans l
      JOIN members m ON m.id = l.member_id
      WHERE l.id = ?
    `).get(loanId) as any;

    if (!loan) {
      return res.status(404).json({ error: 'Loan record not found.' });
    }

    if (user.role === 'MEMBER' && user.memberId !== loan.member_id) {
      return res.status(403).json({ error: 'Access denied. You can only view your own loans.' });
    }

    const repayments = db.prepare('SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY payment_date ASC, created_at ASC').all(loanId);

    res.json({ loan, repayments });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve loan details.' });
  }
});

// Create / Apply Loan (Admin)
loansRouter.post('/', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      memberId,
      loanAmount,
      interestRate = 12.0,
      interestMethod = 'REDUCING_BALANCE',
      termMonths,
      startDate,
      dueDate,
      purpose,
      guarantorName,
      guarantorPhone,
      notes,
      autoDisburse = true,
      cashBankAccountId
    } = req.body;

    const principal = parseFloat(loanAmount);
    const rate = parseFloat(interestRate);
    const months = parseInt(termMonths, 10);

    if (!memberId || isNaN(principal) || principal <= 0 || isNaN(months) || months <= 0) {
      return res.status(400).json({ error: 'Valid Member ID, Loan Amount, and Term are required.' });
    }

    const cleanMemberId = String(memberId).toUpperCase();
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(cleanMemberId) as any;
    if (!member) {
      return res.status(404).json({ error: `Member ${cleanMemberId} not found.` });
    }

    const loanId = getNextLoanId();
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const sDate = startDate || today;

    // Calculate approximate due date if not supplied
    let dDate = dueDate;
    if (!dDate) {
      const d = new Date(sDate);
      d.setMonth(d.getMonth() + months);
      dDate = d.toISOString().split('T')[0];
    }

    // Initial total expected interest estimation
    const totalExpectedInterest = Math.round((principal * (rate / 100) * (months / 12)) * 100) / 100;

    const initialStatus = autoDisburse ? 'ACTIVE' : 'APPROVED';
    const disburseDate = autoDisburse ? today : null;

    db.prepare(`
      INSERT INTO loans (
        id, member_id, application_date, approval_date, disbursement_date,
        loan_amount, interest_rate, interest_method, term_months,
        start_date, due_date, principal_paid, interest_paid,
        remaining_principal, remaining_interest, status, purpose,
        guarantor_name, guarantor_phone, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      loanId,
      cleanMemberId,
      today,
      today,
      disburseDate,
      principal,
      rate,
      interestMethod,
      months,
      sDate,
      dDate,
      principal,
      totalExpectedInterest,
      initialStatus,
      purpose || 'Personal / Business Support',
      guarantorName || null,
      guarantorPhone || null,
      notes || null,
      now,
      now
    );

    // If autoDisburse, update GL and Cash/Bank
    if (autoDisburse) {
      const bankAcc = cashBankAccountId ? db.prepare('SELECT * FROM cash_bank_accounts WHERE id = ?').get(cashBankAccountId) as any : null;
      postGeneralLedger(sDate, loanId, 'Loans Receivable (Assets)', 'ASSET', principal, 0, `Loan disbursement to ${member.full_name} (${loanId})`, 'LOAN', loanId, user.username);
      postGeneralLedger(sDate, loanId, bankAcc?.type === 'BANK' ? 'Bank Account' : 'Cash on Hand', 'ASSET', 0, principal, `Loan disbursement payout (${loanId})`, 'LOAN', loanId, user.username);

      if (bankAcc) {
        const newBankBal = Math.round((bankAcc.current_balance - principal) * 100) / 100;
        db.prepare('UPDATE cash_bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?').run(newBankBal, now, bankAcc.id);
        db.prepare(`
          INSERT INTO cash_bank_transactions (id, receipt_no, account_id, transaction_type, amount, balance_after, description, date, created_by, created_at)
          VALUES (?, ?, ?, 'LOAN_DISBURSEMENT', ?, ?, ?, ?, ?, ?)
        `).run('CB-' + Date.now(), loanId, bankAcc.id, principal, newBankBal, `Loan disbursement for ${member.full_name}`, sDate, user.username, now);
      }
    }

    createNotification(
      'MEMBER',
      'Loan Approved & Disbursed',
      `Your loan application ${loanId} for Rs. ${principal.toLocaleString()} at ${rate}% p.a. has been approved and issued.`,
      'LOAN',
      cleanMemberId
    );

    logAuditAction(user.userId, user.username, 'ADMIN', 'LOAN_CREATED', 'LOAN', loanId, `Issued loan ${loanId} of Rs. ${principal} to ${member.full_name} (${cleanMemberId})`);

    res.json({
      success: true,
      loanId,
      message: `Loan ${loanId} created successfully.`
    });
  } catch (err: any) {
    console.error('Create loan error:', err);
    res.status(500).json({ error: 'Failed to create loan: ' + err.message });
  }
});

// Record Loan Repayment (Admin)
loansRouter.post('/:id/repayments', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const loanId = req.params.id;
    const {
      paymentDate,
      totalAmount,
      principalPortion,
      interestPortion,
      penaltyAmount = 0.0,
      paymentMethod = 'CASH',
      cashBankAccountId,
      notes
    } = req.body;

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId) as any;
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found.' });
    }

    if (loan.status === 'CLEARED') {
      return res.status(400).json({ error: 'This loan is already fully CLEARED and repaid.' });
    }

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(loan.member_id) as any;
    const numTotal = parseFloat(totalAmount);
    let numPrincipal = parseFloat(principalPortion);
    let numInterest = parseFloat(interestPortion);
    const numPenalty = parseFloat(penaltyAmount) || 0.0;

    if (isNaN(numTotal) || numTotal <= 0) {
      return res.status(400).json({ error: 'Valid positive repayment amount is required.' });
    }

    // Default allocation if portions not specified:
    if (isNaN(numPrincipal) || isNaN(numInterest)) {
      // Calculate monthly interest based on remaining principal
      const monthlyRate = (loan.interest_rate / 100) / 12;
      const expectedMonthInterest = Math.round(loan.remaining_principal * monthlyRate * 100) / 100;
      numInterest = Math.min(numTotal, expectedMonthInterest);
      numPrincipal = Math.round((numTotal - numInterest) * 100) / 100;
    }

    // Ensure principal portion does not exceed remaining principal
    if (numPrincipal > loan.remaining_principal) {
      numPrincipal = loan.remaining_principal;
      numInterest = Math.round((numTotal - numPrincipal) * 100) / 100;
    }

    let remainingPrincipalAfter = Math.round((loan.remaining_principal - numPrincipal) * 100) / 100;
    if (remainingPrincipalAfter < 0.01) {
      remainingPrincipalAfter = 0.0;
    }

    const newPrincipalPaid = Math.round((loan.principal_paid + numPrincipal) * 100) / 100;
    const newInterestPaid = Math.round((loan.interest_paid + numInterest) * 100) / 100;

    const isCleared = remainingPrincipalAfter <= 0;
    const newStatus = isCleared ? 'CLEARED' : 'ACTIVE';
    const now = new Date().toISOString();
    const date = paymentDate || now.split('T')[0];
    const receiptNo = getNextReceiptNo();
    const repId = 'REP-' + Date.now();

    // 1. Insert Repayment Record
    db.prepare(`
      INSERT INTO loan_repayments (
        id, receipt_no, loan_id, member_id, payment_date,
        total_amount, principal_amount, interest_amount, penalty_amount,
        payment_method, remaining_principal_after, notes, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      repId,
      receiptNo,
      loanId,
      loan.member_id,
      date,
      numTotal,
      numPrincipal,
      numInterest,
      numPenalty,
      paymentMethod,
      remainingPrincipalAfter,
      notes || null,
      user.username,
      now
    );

    // 2. Update Loan Status & Remaining Balances
    db.prepare(`
      UPDATE loans SET
        principal_paid = ?,
        interest_paid = ?,
        remaining_principal = ?,
        status = ?,
        cleared_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      newPrincipalPaid,
      newInterestPaid,
      remainingPrincipalAfter,
      newStatus,
      isCleared ? now : loan.cleared_at,
      now,
      loanId
    );

    // 3. Post to General Ledger & Cash/Bank
    const bankAcc = cashBankAccountId ? db.prepare('SELECT * FROM cash_bank_accounts WHERE id = ?').get(cashBankAccountId) as any : null;
    postGeneralLedger(date, receiptNo, bankAcc?.type === 'BANK' ? 'Bank Account' : 'Cash on Hand', 'ASSET', numTotal, 0, `Loan repayment from ${member.full_name} (${loanId})`, 'LOAN_REPAYMENT', repId, user.username);
    postGeneralLedger(date, receiptNo, 'Loans Receivable (Assets)', 'ASSET', 0, numPrincipal, `Principal repayment (${loanId})`, 'LOAN_REPAYMENT', repId, user.username);
    postGeneralLedger(date, receiptNo, 'Loan Interest Income', 'REVENUE', 0, numInterest, `Interest income earned (${loanId})`, 'LOAN_REPAYMENT', repId, user.username);

    if (bankAcc) {
      const newBankBal = Math.round((bankAcc.current_balance + numTotal) * 100) / 100;
      db.prepare('UPDATE cash_bank_accounts SET current_balance = ?, updated_at = ? WHERE id = ?').run(newBankBal, now, bankAcc.id);
      db.prepare(`
        INSERT INTO cash_bank_transactions (id, receipt_no, account_id, transaction_type, amount, balance_after, description, date, created_by, created_at)
        VALUES (?, ?, ?, 'DEPOSIT', ?, ?, ?, ?, ?, ?)
      `).run('CB-' + Date.now(), receiptNo, bankAcc.id, numTotal, newBankBal, `Loan repayment from ${member.full_name} (${loanId})`, date, user.username, now);
    }

    // 4. Notification
    const notifMsg = isCleared
      ? `Congratulations! Your loan ${loanId} is now FULLY CLEARED. Final payment of Rs. ${numTotal.toLocaleString()} received. Receipt: ${receiptNo}.`
      : `Repayment of Rs. ${numTotal.toLocaleString()} for loan ${loanId} recorded. Outstanding principal: Rs. ${remainingPrincipalAfter.toLocaleString()}. Receipt: ${receiptNo}.`;

    createNotification('MEMBER', isCleared ? 'Loan Cleared!' : 'Loan Repayment Received', notifMsg, 'LOAN', loan.member_id);

    // 5. Audit Log
    logAuditAction(user.userId, user.username, 'ADMIN', 'REPAYMENT_RECORDED', 'LOAN', loanId, `Recorded repayment of Rs. ${numTotal} for ${loanId} (${member.full_name}). Cleared: ${isCleared}. Receipt: ${receiptNo}.`);

    res.json({
      success: true,
      receiptNo,
      isCleared,
      remainingPrincipal: remainingPrincipalAfter,
      message: isCleared ? `Payment recorded. Loan ${loanId} is now fully CLEARED!` : `Repayment recorded. Receipt: ${receiptNo}`
    });
  } catch (err: any) {
    console.error('Record repayment error:', err);
    res.status(500).json({ error: 'Failed to record repayment: ' + err.message });
  }
});

// Profit / Interest Sharing (Admin)
loansRouter.get('/profit-sharing', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const totalInterestCollected = (db.prepare('SELECT COALESCE(SUM(interest_amount), 0.0) as total FROM loan_repayments').get() as any).total;
    const eligibleMembers = db.prepare("SELECT id, full_name, mobile_phone, membership_date FROM members WHERE membership_status = 'ACTIVE' AND account_status = 'ACTIVE' ORDER BY id ASC").all() as any[];

    const previousDistributions = db.prepare('SELECT * FROM profit_distributions ORDER BY distribution_date DESC').all();

    res.json({
      totalInterestCollected,
      eligibleMemberCount: eligibleMembers.length,
      eligibleMembers,
      previousDistributions
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get profit sharing data.' });
  }
});

loansRouter.post('/profit-sharing', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, periodStart, periodEnd, totalAmount, distributionDate, creditToSavings = true, notes } = req.body;

    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid positive distribution amount is required.' });
    }

    const eligibleMembers = db.prepare("SELECT id, full_name FROM members WHERE membership_status = 'ACTIVE' AND account_status = 'ACTIVE'").all() as any[];
    if (eligibleMembers.length === 0) {
      return res.status(400).json({ error: 'No active eligible members found.' });
    }

    const equalShare = Math.round((amount / eligibleMembers.length) * 100) / 100;
    const distId = 'DIST-' + Date.now();
    const now = new Date().toISOString();
    const dDate = distributionDate || now.split('T')[0];

    db.prepare(`
      INSERT INTO profit_distributions (
        id, title, period_start, period_end, total_interest_income,
        total_distributable_amount, eligible_member_count, share_per_member,
        distribution_date, distribution_method, status, notes, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'EQUAL_SHARE', 'COMPLETED', ?, ?, ?)
    `).run(
      distId,
      title || `Profit Distribution ${periodStart} - ${periodEnd}`,
      periodStart,
      periodEnd,
      amount,
      amount,
      eligibleMembers.length,
      equalShare,
      dDate,
      notes || null,
      user.username,
      now
    );

    // Credit each member's savings account if requested
    if (creditToSavings) {
      for (const m of eligibleMembers) {
        const acc = db.prepare('SELECT id, balance FROM savings_accounts WHERE member_id = ?').get(m.id) as any;
        if (acc) {
          const newBal = Math.round((acc.balance + equalShare) * 100) / 100;
          db.prepare('UPDATE savings_accounts SET balance = ?, updated_at = ? WHERE id = ?').run(newBal, now, acc.id);
          const rNo = getNextReceiptNo();
          db.prepare(`
            INSERT INTO savings_transactions (
              id, receipt_no, member_id, account_id, type, amount, balance_after,
              payment_method, description, created_by, date, created_at
            ) VALUES (?, ?, ?, ?, 'INTEREST_CREDIT', ?, ?, 'INTERNAL_TRANSFER', ?, ?, ?, ?)
          `).run('TX-' + Date.now() + '-' + m.id, rNo, m.id, acc.id, equalShare, newBal, `Profit / Interest distribution credit (${title})`, user.username, dDate, now);

          createNotification('MEMBER', 'Dividend / Interest Shared', `You have received Rs. ${equalShare.toLocaleString()} equal profit share credited directly to your savings account.`, 'PAYMENT', m.id);
        }
      }
    }

    logAuditAction(user.userId, user.username, 'ADMIN', 'PROFIT_DISTRIBUTED', 'PROFIT_SHARING', distId, `Distributed Rs. ${amount} equally among ${eligibleMembers.length} members (Rs. ${equalShare} each).`);

    res.json({
      success: true,
      distId,
      equalShare,
      memberCount: eligibleMembers.length,
      message: `Successfully distributed Rs. ${amount.toLocaleString()} among ${eligibleMembers.length} members.`
    });
  } catch (err: any) {
    console.error('Profit distribution error:', err);
    res.status(500).json({ error: 'Failed to process profit distribution: ' + err.message });
  }
});
