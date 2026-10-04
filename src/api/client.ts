/**
 * Uddhyamsheel Group Management System
 * Production API Client for Cloudflare Pages & D1 Serverless Backend
 * 
 * - Zero storage of auth tokens in localStorage or sessionStorage (pure HttpOnly secure cookies)
 * - credentials: 'include' on all requests
 * - Strict error handling and member isolation
 */

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private inMemoryToken: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  setToken(token: string | null) {
    this.inMemoryToken = token;
  }

  getToken(): string | null {
    return this.inMemoryToken;
  }

  onUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.inMemoryToken) {
      headers['Authorization'] = `Bearer ${this.inMemoryToken}`;
    }

    const response = await fetch(`/api${endpoint}`, {
      ...options,
      credentials: 'include', // Automatically passes HttpOnly secure session cookie
      headers
    });

    if (response.status === 401) {
      this.inMemoryToken = null;
      if (this.onUnauthorizedCallback) {
        this.onUnauthorizedCallback();
      }
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(json.error || `Request failed with status ${response.status}`);
    }

    return json as T;
  }

  // ================= AUTHENTICATION =================
  async login(identifier: string, pin: string, role?: string) {
    const res = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, pin, role })
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me');
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async changeAdminCredentials(currentPin: string, newUsername?: string, newPin?: string) {
    return this.request('/auth/change-admin-credentials', {
      method: 'POST',
      body: JSON.stringify({ currentPin, newUsername, newPin })
    });
  }

  async changeMemberPin(currentPin: string, newPin: string) {
    return this.request('/auth/change-member-pin', {
      method: 'POST',
      body: JSON.stringify({ currentPin, newPin })
    });
  }

  // ================= MEMBER SELF-SERVICE ROUTES =================
  async getMemberFinancialSummary() {
    return this.request<{
      memberId: string;
      totalSavings: number;
      totalContributions: number;
      totalLoanPrincipal: number;
      totalPrincipalPaid: number;
      totalInterestPaid: number;
      totalPenaltyPaid: number;
      totalLoanPayments: number;
      outstandingPrincipal: number;
      outstandingInterest: number;
      outstandingPenalty: number;
      totalOutstanding: number;
    }>('/members/me/financial-summary');
  }

  async getMemberInterestHistory(params: { filter?: string; loanId?: string } = {}) {
    const q = new URLSearchParams();
    if (params.filter) q.set('filter', params.filter);
    if (params.loanId) q.set('loanId', params.loanId);
    return this.request<{
      memberId: string;
      totalInterestPaidToDate: number;
      thisYearInterest: number;
      thisMonthInterest: number;
      repayments: any[];
    }>(`/members/me/interest-history?${q.toString()}`);
  }

  // ================= MEMBERS (ADMIN & AUTHORIZED) =================
  async getMembers(params: { search?: string; status?: string; type?: string } = {}) {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    if (params.type) q.set('type', params.type);
    return this.request<{ members: any[] }>(`/members?${q.toString()}`);
  }

  async getMember(id: string) {
    return this.request<{
      member: any;
      savingsAccount: any;
      totalContributions: number;
      loanSummary: any;
      activeLoans: any[];
      certificates: any[];
      documents: any[];
    }>(`/members/${id}`);
  }

  async createMember(data: any) {
    return this.request('/members', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateMember(id: string, data: any) {
    return this.request(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async archiveMember(id: string) {
    return this.request(`/members/${id}/archive`, { method: 'POST' });
  }

  async restoreMember(id: string) {
    return this.request(`/members/${id}/restore`, { method: 'POST' });
  }

  async permanentlyDeleteMember(id: string, confirmId: string) {
    return this.request(`/members/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirmId })
    });
  }

  async resetMemberPin(id: string, newPin: string) {
    return this.request(`/members/${id}/reset-pin`, {
      method: 'POST',
      body: JSON.stringify({ newPin })
    });
  }

  // ================= SAVINGS =================
  async getSavingsAccounts() {
    return this.request<{ accounts: any[]; summary: any }>('/savings/accounts');
  }

  async getSavingsAccount(memberId: string) {
    return this.request<{ account: any; transactions: any[] }>(`/savings/accounts/${memberId}`);
  }

  async depositSavings(data: { memberId: string; amount: number; paymentMethod?: string; description?: string }) {
    return this.request('/savings/deposit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async withdrawSavings(data: { memberId: string; amount: number; paymentMethod?: string; description?: string }) {
    return this.request('/savings/withdraw', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ================= CONTRIBUTIONS =================
  async getContributions(params: { yearBS?: number; year?: number; monthBS?: number; memberId?: string } = {}) {
    const q = new URLSearchParams();
    const yr = params.yearBS || params.year;
    if (yr) q.set('yearBS', String(yr));
    if (params.monthBS) q.set('monthBS', String(params.monthBS));
    if (params.memberId) q.set('memberId', params.memberId);
    return this.request<{ contributions: any[]; summary?: any }>(`/contributions?${q.toString()}`);
  }

  async recordContribution(data: {
    memberId: string;
    yearBS?: number;
    year?: number;
    monthBS?: number;
    amount: number;
    lateFee?: number;
    paymentDate?: string;
    paymentMethod?: string;
    cashBankAccountId?: string;
    notes?: string;
    remarks?: string;
  }) {
    return this.request<any>('/contributions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getContributionMatrix(params?: number | { yearBS?: number; monthBS?: number; memberId?: string; year?: number }) {
    if (typeof params === 'number') {
      return this.getContributions({ yearBS: params });
    }
    const year = params?.yearBS || params?.year;
    return this.getContributions({ ...params, yearBS: year });
  }

  async recordBulkContributions(data: {
    yearBS: number;
    monthBS: number;
    records: Array<{ memberId: string; amount: number; lateFee?: number }>;
  }) {
    return this.request('/contributions/bulk', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ================= LOANS =================
  async getLoans(params: { memberId?: string; status?: string } = {}) {
    const q = new URLSearchParams();
    if (params.memberId) q.set('memberId', params.memberId);
    if (params.status) q.set('status', params.status);
    return this.request<{ loans: any[] }>(`/loans?${q.toString()}`);
  }

  async getLoan(id: string) {
    return this.request<{ loan: any; repayments: any[] }>(`/loans/${id}`);
  }

  async createLoan(data: any) {
    return this.request('/loans', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async approveLoan(id: string, notes?: string) {
    return this.request(`/loans/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  }

  async recordLoanRepayment(loanId: string, data: any) {
    return this.request<any>(`/loans/${loanId}/repayments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getProfitSharing() {
    return this.request<{ eligibleMembers: any[]; totalEligibleInterest: number; estimatedPool: number }>('/loans/profit-sharing').catch(() => ({
      eligibleMembers: [],
      totalEligibleInterest: 0,
      estimatedPool: 0
    }));
  }

  async distributeProfit(data: any) {
    return this.request<any>('/loans/distribute-profit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ================= SAVINGS TRANSACTIONS =================
  async getSavingsTransactions(params: any = {}) {
    const q = new URLSearchParams(params);
    return this.request<{ transactions: any[] }>(`/savings/transactions?${q.toString()}`).catch(() => ({
      transactions: []
    }));
  }

  async recordSavingsTransaction(data: any) {
    if (data.type === 'WITHDRAW' || data.type === 'WITHDRAWAL') {
      return this.withdrawSavings(data);
    }
    return this.depositSavings(data);
  }

  // ================= ACCOUNTING =================
  async getCashBankAccounts() {
    const res = await this.request<any>('/accounting/accounts');
    return {
      accounts: res.accounts || [],
      transactions: res.transactions || [],
      totals: res.totals || {}
    };
  }

  async getCashBank() {
    return this.getCashBankAccounts();
  }

  async transferCashBank(data: any) {
    return this.request<any>('/accounting/transfer', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getGeneralLedger(params: { startDate?: string; endDate?: string; accountCode?: string; account?: string } = {}) {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    if (params.accountCode || params.account) q.set('accountCode', (params.accountCode || params.account)!);
    const res = await this.request<{ ledger?: any[]; entries?: any[]; totals?: any }>(`/accounting/ledger?${q.toString()}`);
    return {
      ledger: res.ledger || res.entries || [],
      entries: res.entries || res.ledger || [],
      totals: res.totals || {}
    };
  }

  async getInvestments() {
    const res = await this.request<{ investments: any[]; summary?: any }>('/accounting/investments');
    return {
      investments: res.investments || [],
      summary: res.summary || {}
    };
  }

  async createInvestment(data: any) {
    return this.request<any>('/accounting/investments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getAssetsLiabilities() {
    const res = await this.request<{ records: any[]; summary?: any }>('/accounting/assets-liabilities');
    return {
      records: res.records || [],
      summary: res.summary || {}
    };
  }

  async createAssetLiability(data: any) {
    return this.request<any>('/accounting/assets-liabilities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ================= DASHBOARD & REPORTS =================
  async getAdminDashboard() {
    return this.request<{
      summary: any;
      recentActivities: any[];
      monthlyFlow: any[];
      rules: any;
    }>('/dashboard-reports');
  }

  async getDashboardSummary() {
    return this.getAdminDashboard();
  }

  async getMemberStatement(memberId: string) {
    return this.request<any>(`/members/${memberId}/statement`);
  }

  async getAuditLogs(params: { limit?: number; action?: string } = {}) {
    const q = new URLSearchParams();
    if (params.limit) q.set('limit', String(params.limit));
    if (params.action) q.set('action', params.action);
    return this.request<{ logs: any[] }>(`/audit-logs?${q.toString()}`);
  }

  async getNotifications() {
    return this.request<{ notifications: any[]; unreadCount: number }>('/notifications');
  }

  async broadcastNotification(data: any) {
    return this.request<any>('/notifications', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: 'POST' });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'POST' });
  }

  // ================= SETTINGS =================
  async getSettings() {
    return this.request<{ orgConfig: any; financialRules: any }>('/settings');
  }

  async updateSettings(data: any) {
    if (data.orgConfig) await this.updateOrgConfig(data.orgConfig);
    if (data.financialRules) await this.updateFinancialRules(data.financialRules);
    return this.getSettings();
  }

  async updateOrgConfig(config: any) {
    return this.request('/settings/org', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  async updateFinancialRules(rules: any) {
    return this.request('/settings/financial-rules', {
      method: 'PUT',
      body: JSON.stringify(rules)
    });
  }

  // ================= CERTIFICATES & DOCUMENTS =================
  async getCertificates() {
    return this.request<{ certificates: any[] }>('/certificates');
  }

  async issueCertificate(data: { memberId: string; title: string; issueDate: string; notes?: string }) {
    return this.request('/certificates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getDocuments() {
    return this.request<{ documents: any[] }>('/documents');
  }

  async uploadDocument(data: any) {
    return this.request<any>('/documents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

export const api = new ApiClient();
