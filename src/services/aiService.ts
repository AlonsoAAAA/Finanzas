import {
  AdvisorChatMessage,
  AdvisorInsight,
  BreezeState,
  ChatAttachment,
  ExtractedTransactionDraft,
  SpendCategory,
  TransactionType,
} from '../types/breeze';

const VALID_CATEGORIES = new Set<SpendCategory>([
  'Groceries',
  'Dining Out',
  'Transit & Travel',
  'Home & Utilities',
  'Wellness',
  'Shopping',
  'Subscriptions',
  'Income',
  'Transfer',
]);

export function buildFinancialContext(state: BreezeState) {
  const spentByCategory: Record<string, number> = {};
  let novIncome = 0;
  let novExpenses = 0;

  for (const tx of state.transactions) {
    if (tx.date.startsWith('2026-11')) {
      if (tx.type === 'income') novIncome += tx.amount;
      if (tx.type === 'expense') {
        novExpenses += tx.amount;
        spentByCategory[tx.category] =
          (spentByCategory[tx.category] || 0) + tx.amount;
      }
    }
  }

  const netWorth = state.accounts
    .filter((a) => a.includeInNetWorth !== false)
    .reduce((sum, a) => sum + a.balance, 0);

  return {
    netWorth: Math.round(netWorth * 100) / 100,
    novemberSummary: {
      income: Math.round(novIncome * 100) / 100,
      expenses: Math.round(novExpenses * 100) / 100,
      netCashFlow: Math.round((novIncome - novExpenses) * 100) / 100,
    },
    accounts: state.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      institution: a.institution,
      type: a.type,
      balance: a.balance,
      apyOrApr: a.apyOrApr,
      creditLimit: a.creditLimit,
      isPrimary: a.isPrimary,
    })),
    budgets: state.budgets.map((b) => ({
      category: b.category,
      limit: b.limit,
      spentThisMonth: Math.round((spentByCategory[b.category] || 0) * 100) / 100,
    })),
    upcomingBills: state.bills
      .filter((b) => !b.paidThisCycle)
      .map((b) => ({
        name: b.name,
        amount: b.amount,
        dueDate: b.dueDate,
        autoPay: b.autoPay,
      })),
    goals: state.goals.map((g) => ({
      title: g.title,
      savedAmount: g.savedAmount,
      targetAmount: g.targetAmount,
      monthlyTarget: g.monthlyTarget,
      targetDate: g.targetDate,
    })),
    investments: (state.holdings || []).map((h) => ({
      ticker: h.ticker,
      name: h.name,
      assetClass: h.assetClass,
      shares: h.shares,
      avgCost: h.avgCost,
      currentPrice: h.currentPrice,
      marketValue: Math.round(h.shares * h.currentPrice * 100) / 100,
      dividendYieldPct: h.dividendYieldPct,
    })),
    recentTransactions: state.transactions.slice(0, 12).map((t) => ({
      merchant: t.merchant,
      amount: t.amount,
      type: t.type,
      category: t.category,
      date: t.date,
      accountId: t.accountId,
    })),
  };
}

export async function sendAdvisorChat(params: {
  message: string;
  history: AdvisorChatMessage[];
  attachment?: ChatAttachment | null;
  state: BreezeState;
}): Promise<{
  reply: string;
  extractedTransactions: ExtractedTransactionDraft[];
  suggestedFollowUps: string[];
}> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      history: params.history.map((m) => ({ role: m.role, text: m.text })),
      attachment: params.attachment
        ? {
            fileName: params.attachment.fileName,
            mimeType: params.attachment.mimeType,
            data: params.attachment.data,
          }
        : undefined,
      financialContext: buildFinancialContext(params.state),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to reach Breeze AI Advisor.');
  }

  const fallbackAccountId =
    params.state.accounts.find((a) => a.isPrimary)?.id ||
    params.state.accounts[0]?.id ||
    'acc-checking';
  const validAccountIds = new Set(params.state.accounts.map((a) => a.id));

  const extractedTransactions: ExtractedTransactionDraft[] = Array.isArray(
    data.extractedTransactions
  )
    ? data.extractedTransactions.map(
        (
          item: {
            merchant?: string;
            amount?: number;
            type?: string;
            category?: string;
            date?: string;
            accountId?: string;
            notes?: string;
          },
          idx: number
        ) => {
          const rawType = (item.type || 'expense').toLowerCase();
          const type: TransactionType =
            rawType === 'income' || rawType === 'transfer'
              ? rawType
              : 'expense';
          const cat = VALID_CATEGORIES.has(item.category as SpendCategory)
            ? (item.category as SpendCategory)
            : type === 'income'
            ? 'Income'
            : type === 'transfer'
            ? 'Transfer'
            : 'Shopping';

          return {
            id: `draft-${Date.now()}-${idx}`,
            merchant: item.merchant || 'Receipt Expense',
            amount: Math.max(0.01, Math.round((Number(item.amount) || 0) * 100) / 100),
            type,
            category: cat,
            date: /^\d{4}-\d{2}-\d{2}$/.test(item.date || '')
              ? (item.date as string)
              : '2026-11-21',
            accountId: validAccountIds.has(item.accountId || '')
              ? (item.accountId as string)
              : fallbackAccountId,
            notes: item.notes,
            saved: false,
          };
        }
      )
    : [];

  return {
    reply: data.reply || 'Here is what I found.',
    extractedTransactions,
    suggestedFollowUps: Array.isArray(data.suggestedFollowUps)
      ? data.suggestedFollowUps
      : [],
  };
}

export async function fetchProactiveInsights(
  state: BreezeState,
  language: 'en' | 'es' = 'en'
): Promise<{
  headlineTip: string;
  insights: AdvisorInsight[];
}> {
  const res = await fetch('/api/ai/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      financialContext: buildFinancialContext(state),
      language,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to load advisor insights.');
  }

  return {
    headlineTip: data.headlineTip || '',
    insights: Array.isArray(data.insights) ? data.insights : [],
  };
}
