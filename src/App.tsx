import {
  Landmark,
  LayoutGrid,
  Lightbulb,
  Menu,
  MessageSquareText,
  PieChart,
  Plus,
  ReceiptText,
  RotateCcw,
  TrendingUp,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccountsScreen } from './components/AccountsScreen';
import { ActivityScreen } from './components/ActivityScreen';
import { AdviceScreen } from './components/AdviceScreen';
import { AiChatScreen } from './components/AiChatScreen';
import { BudgetsScreen } from './components/BudgetsScreen';
import { GoalsScreen } from './components/GoalsScreen';
import { InvestmentsScreen } from './components/InvestmentsScreen';
import {
  BudgetModal,
  ContributeGoalModal,
  CreateGoalModal,
  TransactionModal,
  TransferModal,
} from './components/Modals';
import { OverviewScreen } from './components/OverviewScreen';
import { USER_PROFILE } from './data/seedData';
import { fetchProactiveInsights } from './services/aiService';
import {
  Account,
  AdvisorChatMessage,
  AdvisorInsight,
  BreezeState,
  CategoryBudget,
  ExtractedTransactionDraft,
  InvestmentAssetClass,
  InvestmentHolding,
  PlanSubTab,
  SavingsGoal,
  ScreenTab,
  SpendCategory,
  Transaction,
} from './types/breeze';
import {
  clearBreezeStorage,
  formatCurrency,
  loadBreezeState,
  saveBreezeState,
} from './utils/formatters';

function applyTransactionDelta(
  accounts: Account[],
  tx: Pick<Transaction, 'type' | 'amount' | 'accountId' | 'toAccountId'>,
  direction: 1 | -1
): Account[] {
  return accounts.map((acc) => {
    let delta = 0;
    if (tx.type === 'income' && acc.id === tx.accountId) {
      delta = tx.amount * direction;
    } else if (tx.type === 'expense' && acc.id === tx.accountId) {
      delta = -tx.amount * direction;
    } else if (tx.type === 'transfer') {
      if (acc.id === tx.accountId) delta -= tx.amount * direction;
      if (acc.id === tx.toAccountId) delta += tx.amount * direction;
    }
    if (delta === 0) return acc;
    return { ...acc, balance: Math.round((acc.balance + delta) * 100) / 100 };
  });
}

// Primary 5-item navigation (Bottom Tab Bar + Top Desktop Nav)
const PRIMARY_NAV_ITEMS: {
  id: ScreenTab;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'activity', label: 'Activity', icon: ReceiptText },
  { id: 'ai-chat', label: 'AI Chat', icon: MessageSquareText },
  { id: 'plan', label: 'Plan', icon: PieChart },
  { id: 'advice', label: 'Advice', icon: Lightbulb },
];

// Side Drawer navigation sections (Accounts & Investments featured + quick jump to all)
const DRAWER_MANAGE_ITEMS: {
  id: ScreenTab;
  label: string;
  description: string;
  icon: typeof Landmark;
}[] = [
  {
    id: 'accounts',
    label: 'Accounts',
    description: 'Configure banks, cards, APY & limits',
    icon: Landmark,
  },
  {
    id: 'investments',
    label: 'Investments',
    description: 'Portfolio holdings, ETFs & yield',
    icon: TrendingUp,
  },
];

const INITIAL_CHAT_MESSAGE: AdvisorChatMessage = {
  id: 'ai-welcome',
  role: 'assistant',
  timestamp: 'Now',
  text: 'Hola, Maya. Soy tu asesor Breeze AI. Puedes escribir un gasto ("Café $6.50 hoy"), subir una foto de un ticket, recibo o estado de cuenta (imagen, PDF o CSV) para categorizarlo automáticamente, o preguntarme consejos financieros sobre tus cuentas, presupuestos e inversiones.',
};

export default function App() {
  const [state, setState] = useState<BreezeState>(() => loadBreezeState());
  const [activeTab, setActiveTab] = useState<ScreenTab>('overview');
  const [planSubTab, setPlanSubTab] = useState<PlanSubTab>('budgets');
  const [activityAccountFilter, setActivityAccountFilter] =
    useState<string>('');
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // Modal states
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [createGoalModalOpen, setCreateGoalModalOpen] = useState(false);
  const [contributingGoal, setContributingGoal] =
    useState<SavingsGoal | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] =
    useState<CategoryBudget | null>(null);

  // AI Advisor & Scanner state
  const [aiTargetAccountId, setAiTargetAccountId] = useState<
    string | undefined
  >(undefined);
  const [chatMessages, setChatMessages] = useState<AdvisorChatMessage[]>([
    INITIAL_CHAT_MESSAGE,
  ]);
  const [insights, setInsights] = useState<AdvisorInsight[]>([]);
  const [headlineTip, setHeadlineTip] = useState<string>('');
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [advisorLanguage, setAdvisorLanguage] = useState<'en' | 'es'>('en');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    saveBreezeState(state);
  }, [state]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!sideMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSideMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sideMenuOpen]);

  const loadInsights = useCallback(
    async (targetState: BreezeState, lang: 'en' | 'es') => {
      setInsightsLoading(true);
      setInsightsError(null);
      try {
        const res = await fetchProactiveInsights(targetState, lang);
        setHeadlineTip(res.headlineTip);
        setInsights(res.insights);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to load advisor insights.';
        setInsightsError(msg);
      } finally {
        setInsightsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadInsights(state, advisorLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisorLanguage]);

  const netWorth = useMemo(
    () =>
      state.accounts
        .filter((a) => a.includeInNetWorth !== false)
        .reduce((s, a) => s + a.balance, 0),
    [state.accounts]
  );

  const portfolioTotal = useMemo(
    () =>
      state.holdings.reduce((s, h) => s + h.shares * h.currentPrice, 0),
    [state.holdings]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleNavigate = (tab: ScreenTab, subTab?: PlanSubTab) => {
    if (tab !== 'activity') setActivityAccountFilter('');
    if (tab === 'plan' && subTab) setPlanSubTab(subTab);
    setActiveTab(tab);
    setSideMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAccount = (accountId: string) => {
    setActivityAccountFilter(accountId);
    setActiveTab('activity');
    setSideMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveTransaction = (
    payload: Omit<Transaction, 'id'>,
    existingId?: string
  ) => {
    setState((prev) => {
      if (existingId) {
        const oldTx = prev.transactions.find((t) => t.id === existingId);
        let nextAccounts = prev.accounts;
        if (oldTx) {
          nextAccounts = applyTransactionDelta(nextAccounts, oldTx, -1);
        }
        nextAccounts = applyTransactionDelta(nextAccounts, payload, 1);

        return {
          ...prev,
          accounts: nextAccounts,
          transactions: prev.transactions.map((t) =>
            t.id === existingId ? { ...payload, id: existingId } : t
          ),
        };
      }

      const newTx: Transaction = {
        ...payload,
        id: `tx-${Date.now()}`,
      };
      return {
        ...prev,
        accounts: applyTransactionDelta(prev.accounts, newTx, 1),
        transactions: [newTx, ...prev.transactions],
      };
    });

    setTxModalOpen(false);
    setEditingTx(null);
    showToast(existingId ? 'Transaction updated' : 'Transaction added');
  };

  const handleCommitExtractedTransactions = (
    drafts: ExtractedTransactionDraft[]
  ) => {
    if (drafts.length === 0) return;

    setState((prev) => {
      let nextAccounts = prev.accounts;
      const newTxs: Transaction[] = drafts.map((d, idx) => {
        const tx: Transaction = {
          id: `tx-${Date.now()}-${idx}`,
          merchant: d.merchant,
          category: d.category,
          type: d.type,
          amount: d.amount,
          date: d.date,
          timeLabel: 'AI Scanned',
          accountId: d.accountId,
          status: 'completed',
          notes: d.notes || 'Categorized via Breeze AI',
        };
        nextAccounts = applyTransactionDelta(nextAccounts, tx, 1);
        return tx;
      });

      return {
        ...prev,
        accounts: nextAccounts,
        transactions: [...newTxs, ...prev.transactions],
      };
    });

    showToast(
      drafts.length === 1
        ? `Added ${drafts[0].merchant} (${formatCurrency(drafts[0].amount)})`
        : `Added ${drafts.length} transactions to ledger`
    );
  };

  const handleDeleteTransaction = (txId: string) => {
    setState((prev) => {
      const target = prev.transactions.find((t) => t.id === txId);
      const nextAccounts = target
        ? applyTransactionDelta(prev.accounts, target, -1)
        : prev.accounts;
      return {
        ...prev,
        accounts: nextAccounts,
        transactions: prev.transactions.filter((t) => t.id !== txId),
      };
    });
    setTxModalOpen(false);
    setEditingTx(null);
    showToast('Transaction removed');
  };

  const handleTransfer = (
    fromId: string,
    toId: string,
    amount: number,
    note: string
  ) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      merchant: note || 'Internal Transfer',
      category: 'Transfer',
      type: 'transfer',
      amount,
      date: '2026-11-21',
      timeLabel: 'Just now',
      accountId: fromId,
      toAccountId: toId,
      status: 'completed',
    };

    setState((prev) => ({
      ...prev,
      accounts: applyTransactionDelta(prev.accounts, newTx, 1),
      transactions: [newTx, ...prev.transactions],
    }));

    setTransferModalOpen(false);
    showToast(`Transferred ${formatCurrency(amount)}`);
  };

  const handleToggleBillAutoPay = (billId: string) => {
    setState((prev) => ({
      ...prev,
      bills: prev.bills.map((b) =>
        b.id === billId ? { ...b, autoPay: !b.autoPay } : b
      ),
    }));
  };

  const handlePayBill = (billId: string) => {
    const targetBill = state.bills.find((b) => b.id === billId);
    if (!targetBill || targetBill.paidThisCycle) return;

    const paymentTx: Transaction = {
      id: `tx-${Date.now()}`,
      merchant: targetBill.provider,
      category: targetBill.category,
      type: 'expense',
      amount: targetBill.amount,
      date: '2026-11-21',
      timeLabel: 'Just now',
      accountId: targetBill.accountId,
      status: 'completed',
      notes: `Settled recurring bill: ${targetBill.name}`,
    };

    setState((prev) => ({
      ...prev,
      accounts: applyTransactionDelta(prev.accounts, paymentTx, 1),
      transactions: [paymentTx, ...prev.transactions],
      bills: prev.bills.map((b) =>
        b.id === billId ? { ...b, paidThisCycle: true } : b
      ),
    }));

    showToast(`Paid ${targetBill.name} (${formatCurrency(targetBill.amount)})`);
  };

  const handleContributeGoal = (
    goalId: string,
    accountId: string,
    amount: number
  ) => {
    const goal = state.goals.find((g) => g.id === goalId);
    if (!goal) return;

    const contributionTx: Transaction = {
      id: `tx-${Date.now()}`,
      merchant: `Goal: ${goal.title}`,
      category: 'Transfer',
      type: 'expense',
      amount,
      date: '2026-11-21',
      timeLabel: 'Just now',
      accountId,
      status: 'completed',
      notes: 'Contribution toward savings milestone',
    };

    setState((prev) => ({
      ...prev,
      accounts: applyTransactionDelta(prev.accounts, contributionTx, 1),
      transactions: [contributionTx, ...prev.transactions],
      goals: prev.goals.map((g) =>
        g.id === goalId ? { ...g, savedAmount: g.savedAmount + amount } : g
      ),
    }));

    setContributingGoal(null);
    showToast(`Added ${formatCurrency(amount, false)} to ${goal.title}`);
  };

  const handleCreateGoal = (goalData: Omit<SavingsGoal, 'id'>) => {
    const newGoal: SavingsGoal = {
      ...goalData,
      id: `goal-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      goals: [...prev.goals, newGoal],
    }));
    setCreateGoalModalOpen(false);
    showToast(`Created goal "${newGoal.title}"`);
  };

  const handleSaveBudget = (
    category: Exclude<SpendCategory, 'Income' | 'Transfer'>,
    limit: number,
    existingId?: string
  ) => {
    setState((prev) => {
      if (existingId) {
        return {
          ...prev,
          budgets: prev.budgets.map((b) =>
            b.id === existingId ? { ...b, limit } : b
          ),
        };
      }
      const nextBudget: CategoryBudget = {
        id: `bud-${Date.now()}`,
        category,
        limit,
        accent: 'primary',
      };
      return {
        ...prev,
        budgets: [...prev.budgets, nextBudget],
      };
    });
    setBudgetModalOpen(false);
    setEditingBudget(null);
    showToast(`${category} limit set to ${formatCurrency(limit, false)}`);
  };

  const handleSaveAccount = (
    payload: Omit<Account, 'id'>,
    existingId?: string
  ) => {
    setState((prev) => {
      let nextAccounts = prev.accounts;
      if (payload.isPrimary) {
        nextAccounts = nextAccounts.map((a) => ({ ...a, isPrimary: false }));
      }
      if (existingId) {
        return {
          ...prev,
          accounts: nextAccounts.map((a) =>
            a.id === existingId ? { ...payload, id: existingId } : a
          ),
        };
      }
      const newAcc: Account = {
        ...payload,
        id: `acc-${Date.now()}`,
      };
      return {
        ...prev,
        accounts: [...nextAccounts, newAcc],
      };
    });
    showToast(existingId ? 'Account configuration saved' : 'Account added');
  };

  const handleDeleteAccount = (accountId: string) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== accountId),
    }));
    showToast('Account removed');
  };

  const handleToggleIncludeNetWorth = (accountId: string) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === accountId
          ? { ...a, includeInNetWorth: a.includeInNetWorth === false }
          : a
      ),
    }));
  };

  const handleBuyOrAddHolding = (params: {
    holdingId?: string;
    ticker: string;
    name: string;
    assetClass: InvestmentAssetClass;
    shares: number;
    price: number;
    fundingAccountId?: string;
    investmentAccountId: string;
  }) => {
    const orderTotal = Math.round(params.shares * params.price * 100) / 100;

    setState((prev) => {
      let nextHoldings = prev.holdings;
      if (params.holdingId) {
        nextHoldings = prev.holdings.map((h) => {
          if (h.id !== params.holdingId) return h;
          const newShares = Math.round((h.shares + params.shares) * 1000) / 1000;
          const totalBasis = h.shares * h.avgCost + orderTotal;
          return {
            ...h,
            shares: newShares,
            currentPrice: params.price,
            avgCost: Math.round((totalBasis / newShares) * 100) / 100,
          };
        });
      } else {
        const created: InvestmentHolding = {
          id: `hold-${Date.now()}`,
          ticker: params.ticker,
          name: params.name,
          assetClass: params.assetClass,
          shares: params.shares,
          avgCost: params.price,
          currentPrice: params.price,
          dayChangePct: 0,
          dividendYieldPct: 1.5,
          accountId: params.investmentAccountId,
        };
        nextHoldings = [...prev.holdings, created];
      }

      let nextAccounts = prev.accounts.map((acc) => {
        if (acc.id === params.investmentAccountId) {
          return {
            ...acc,
            balance: Math.round((acc.balance + orderTotal) * 100) / 100,
          };
        }
        return acc;
      });

      let nextTransactions = prev.transactions;
      if (params.fundingAccountId) {
        const buyTx: Transaction = {
          id: `tx-${Date.now()}`,
          merchant: `Buy ${params.shares} ${params.ticker}`,
          category: 'Transfer',
          type: 'transfer',
          amount: orderTotal,
          date: '2026-11-21',
          timeLabel: 'Just now',
          accountId: params.fundingAccountId,
          toAccountId: params.investmentAccountId,
          status: 'completed',
          notes: `Investment purchase @ ${formatCurrency(params.price)}/sh`,
        };
        nextAccounts = nextAccounts.map((acc) =>
          acc.id === params.fundingAccountId
            ? {
                ...acc,
                balance: Math.round((acc.balance - orderTotal) * 100) / 100,
              }
            : acc
        );
        nextTransactions = [buyTx, ...prev.transactions];
      }

      return {
        ...prev,
        holdings: nextHoldings,
        accounts: nextAccounts,
        transactions: nextTransactions,
      };
    });

    showToast(`Purchased ${params.shares} ${params.ticker}`);
  };

  const handleUpdateHolding = (updated: InvestmentHolding) => {
    setState((prev) => {
      const old = prev.holdings.find((h) => h.id === updated.id);
      const oldVal = old ? old.shares * old.currentPrice : 0;
      const newVal = updated.shares * updated.currentPrice;
      const delta = Math.round((newVal - oldVal) * 100) / 100;

      return {
        ...prev,
        holdings: prev.holdings.map((h) =>
          h.id === updated.id ? updated : h
        ),
        accounts: prev.accounts.map((a) =>
          a.id === updated.accountId
            ? { ...a, balance: Math.round((a.balance + delta) * 100) / 100 }
            : a
        ),
      };
    });
    showToast(`Updated ${updated.ticker}`);
  };

  const handleDeleteHolding = (holdingId: string) => {
    setState((prev) => {
      const target = prev.holdings.find((h) => h.id === holdingId);
      const val = target
        ? Math.round(target.shares * target.currentPrice * 100) / 100
        : 0;
      return {
        ...prev,
        holdings: prev.holdings.filter((h) => h.id !== holdingId),
        accounts: target
          ? prev.accounts.map((a) =>
              a.id === target.accountId
                ? { ...a, balance: Math.max(0, Math.round((a.balance - val) * 100) / 100) }
                : a
            )
          : prev.accounts,
      };
    });
    showToast('Position removed');
  };

  const handleResetDemo = () => {
    const fresh = clearBreezeStorage();
    setState(fresh);
    void loadInsights(fresh, advisorLanguage);
    showToast('Restored default Breeze sample portfolio');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#181A1C] pb-20 md:pb-0">
      {/* Top Navigation Bar with Top-Left Hamburger Menu */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E2E4E7]/80">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-[56px] md:h-[72px] flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Top-Left Hamburger + Single-Line Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              aria-label="Open side navigation menu"
              aria-expanded={sideMenuOpen}
              onClick={() => setSideMenuOpen(true)}
              className="w-10 h-10 -ml-1.5 rounded-full hover:bg-[#F3F5F7] flex items-center justify-center text-[#181A1C] transition-colors cursor-pointer"
            >
              <Menu size={21} />
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('overview')}
              className="text-[22px] font-extrabold tracking-[-0.03em] text-[#181A1C] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Breeze
            </button>
          </div>

          {/* Zone 2: 5 Primary single-line nav links (Desktop) */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7"
          >
            {PRIMARY_NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`relative py-2 text-[15px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-[#00A24E]'
                      : 'text-[#66686D] hover:text-[#181A1C]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full bg-[#00A24E]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setTxModalOpen(true);
              }}
              className="h-9 md:h-11 px-4 md:px-5 rounded-full bg-[#00A24E] hover:bg-[#159A49] text-[#FFFFFF] text-[13px] md:text-[14px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Transaction</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container (1200px centered Breeze desktop layout) */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'overview' && (
          <OverviewScreen
            accounts={state.accounts}
            transactions={state.transactions}
            budgets={state.budgets}
            bills={state.bills}
            goals={state.goals}
            headlineTip={headlineTip}
            insightsLoading={insightsLoading}
            onNavigate={handleNavigate}
            onOpenNewTransaction={() => {
              setEditingTx(null);
              setTxModalOpen(true);
            }}
            onOpenTransfer={() => setTransferModalOpen(true)}
            onOpenNewGoal={() => setCreateGoalModalOpen(true)}
            onOpenAiDrawer={() => {
              setAiTargetAccountId(undefined);
              handleNavigate('ai-chat');
            }}
            onSelectTransaction={(tx) => {
              setEditingTx(tx);
              setTxModalOpen(true);
            }}
            onSelectAccount={handleSelectAccount}
            onPayBill={handlePayBill}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityScreen
            accounts={state.accounts}
            transactions={state.transactions}
            initialAccountFilter={activityAccountFilter}
            onClearInitialAccount={() => setActivityAccountFilter('')}
            onOpenNewTransaction={() => {
              setEditingTx(null);
              setTxModalOpen(true);
            }}
            onSelectTransaction={(tx) => {
              setEditingTx(tx);
              setTxModalOpen(true);
            }}
          />
        )}

        {activeTab === 'ai-chat' && (
          <AiChatScreen
            state={state}
            messages={chatMessages}
            onMessagesChange={setChatMessages}
            onCommitTransactions={handleCommitExtractedTransactions}
            defaultAccountId={aiTargetAccountId}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsScreen
            accounts={state.accounts}
            onSaveAccount={handleSaveAccount}
            onDeleteAccount={handleDeleteAccount}
            onToggleIncludeNetWorth={handleToggleIncludeNetWorth}
            onViewAccountLedger={handleSelectAccount}
            onImportStatementForAccount={(acc) => {
              setAiTargetAccountId(acc.id);
              handleNavigate('ai-chat');
            }}
          />
        )}

        {activeTab === 'investments' && (
          <InvestmentsScreen
            holdings={state.holdings}
            accounts={state.accounts}
            onBuyOrAddHolding={handleBuyOrAddHolding}
            onUpdateHolding={handleUpdateHolding}
            onDeleteHolding={handleDeleteHolding}
            onAskAiAboutPortfolio={(prompt) => {
              setChatMessages((prev) => [
                ...prev,
                {
                  id: `usr-port-${Date.now()}`,
                  role: 'user',
                  text: prompt,
                  timestamp: 'Just now',
                },
              ]);
              handleNavigate('advice');
            }}
          />
        )}

        {activeTab === 'plan' && (
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1 p-1.5 rounded-full bg-[#F3F5F7]">
              <button
                type="button"
                onClick={() => setPlanSubTab('budgets')}
                className={`min-h-[38px] px-5 rounded-full text-[14px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  planSubTab === 'budgets'
                    ? 'bg-[#FFFFFF] text-[#181A1C] shadow-xs'
                    : 'text-[#66686D] hover:text-[#181A1C]'
                }`}
              >
                Budgets & Bills
              </button>
              <button
                type="button"
                onClick={() => setPlanSubTab('goals')}
                className={`min-h-[38px] px-5 rounded-full text-[14px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  planSubTab === 'goals'
                    ? 'bg-[#FFFFFF] text-[#181A1C] shadow-xs'
                    : 'text-[#66686D] hover:text-[#181A1C]'
                }`}
              >
                Savings Goals
              </button>
            </div>

            {planSubTab === 'budgets' ? (
              <BudgetsScreen
                budgets={state.budgets}
                bills={state.bills}
                transactions={state.transactions}
                accounts={state.accounts}
                onEditBudget={(budget) => {
                  setEditingBudget(budget);
                  setBudgetModalOpen(true);
                }}
                onAddBudget={() => {
                  setEditingBudget(null);
                  setBudgetModalOpen(true);
                }}
                onToggleBillAutoPay={handleToggleBillAutoPay}
                onPayBill={handlePayBill}
              />
            ) : (
              <GoalsScreen
                goals={state.goals}
                accounts={state.accounts}
                onContributeGoal={(goal) => setContributingGoal(goal)}
                onCreateGoal={() => setCreateGoalModalOpen(true)}
              />
            )}
          </div>
        )}

        {activeTab === 'advice' && (
          <AdviceScreen
            state={state}
            insights={insights}
            headlineTip={headlineTip}
            insightsLoading={insightsLoading}
            insightsError={insightsError}
            language={advisorLanguage}
            onLanguageChange={setAdvisorLanguage}
            onRefreshInsights={() => void loadInsights(state, advisorLanguage)}
            chatMessages={chatMessages}
            onChatMessagesChange={setChatMessages}
            onCommitTransactions={handleCommitExtractedTransactions}
          />
        )}
      </main>

      {/* Clean Editorial Footer with Profile & Demo Reset */}
      {activeTab !== 'ai-chat' && (
        <footer className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8 border-t border-[#E2E4E7]/70 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={USER_PROFILE.avatarUrl}
              alt={USER_PROFILE.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-[#E2E4E7]"
            />
            <div className="text-[13px] text-[#66686D]">
              <span className="font-semibold text-[#181A1C]">
                {USER_PROFILE.name}
              </span>{' '}
              · Saved locally in your browser
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDemo}
            className="min-h-[40px] px-4 rounded-full bg-[#F3F5F7] hover:bg-[#E2E4E7] text-[13px] font-semibold text-[#181A1C] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset sample data</span>
          </button>
        </footer>
      )}

      {/* Left Slide-Out Side Navigation Drawer (Hamburger Menu) */}
      {sideMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-start bg-[#181A1C]/35 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Side navigation menu"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSideMenuOpen(false);
          }}
        >
          <aside className="w-[310px] max-w-[85vw] h-full bg-[#FFFFFF] breeze-overlay flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-[#E2E4E7] flex items-center justify-between">
                <span className="text-[20px] font-extrabold tracking-[-0.03em] text-[#181A1C]">
                  Breeze
                </span>
                <button
                  type="button"
                  aria-label="Close side menu"
                  onClick={() => setSideMenuOpen(false)}
                  className="w-9 h-9 rounded-full bg-[#F3F5F7] hover:bg-[#E2E4E7] flex items-center justify-center text-[#181A1C] cursor-pointer"
                >
                  <X size={17} />
                </button>
              </div>

              {/* Quick Wealth Summary */}
              <div className="p-5 border-b border-[#E2E4E7]/80">
                <div className="flex items-center gap-3">
                  <img
                    src={USER_PROFILE.avatarUrl}
                    alt={USER_PROFILE.name}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover border border-[#E2E4E7]"
                  />
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-[#181A1C] truncate">
                      {USER_PROFILE.name}
                    </p>
                    <p className="text-[12px] text-[#66686D] tabular-nums">
                      Net worth {formatCurrency(netWorth, false)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Wealth & Configuration Sections (Accounts & Investments) */}
              <div className="p-4 space-y-1.5">
                <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[#66686D]">
                  Wealth & Setup
                </p>
                {DRAWER_MANAGE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const badgeValue =
                    item.id === 'accounts'
                      ? `${state.accounts.length}`
                      : formatCurrency(portfolioTotal, false);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full px-3.5 py-3 rounded-[16px] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#DBFCE1] text-[#006B31]'
                          : 'hover:bg-[#F3F5F7] text-[#181A1C]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-[#FFFFFF]' : 'bg-[#F3F5F7]'
                          }`}
                        >
                          <Icon
                            size={19}
                            className={
                              isActive ? 'text-[#00A24E]' : 'text-[#181A1C]'
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold truncate">
                            {item.label}
                          </p>
                          <p className="text-[12px] text-[#66686D] truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-[12px] font-semibold text-[#66686D] tabular-nums shrink-0">
                        {badgeValue}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Core Navigation Shortcuts */}
              <div className="px-4 pb-4 space-y-1">
                <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[#66686D]">
                  Workspace
                </p>
                {PRIMARY_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full min-h-[44px] px-3.5 rounded-[14px] flex items-center gap-3 text-left text-[14px] font-semibold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#F3F5F7] text-[#00A24E]'
                          : 'text-[#181A1C] hover:bg-[#F3F5F7]'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={
                          isActive ? 'text-[#00A24E]' : 'text-[#66686D]'
                        }
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-[#E2E4E7]/80">
              <button
                type="button"
                onClick={() => {
                  setSideMenuOpen(false);
                  handleResetDemo();
                }}
                className="w-full h-11 px-4 rounded-full bg-[#F3F5F7] hover:bg-[#E2E4E7] text-[13px] font-semibold text-[#181A1C] inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Reset sample data</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Fixed Bottom Tab Bar (5 items including AI Chat, 56px height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E2E4E7] grid grid-cols-5 items-center"
      >
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isAiTab = item.id === 'ai-chat';
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                isActive ? 'text-[#00A24E]' : 'text-[#66686D]'
              }`}
            >
              {isAiTab ? (
                <span
                  className={`w-8 h-6 rounded-full flex items-center justify-center ${
                    isActive
                      ? 'bg-[#00A24E] text-[#FFFFFF]'
                      : 'bg-[#DBFCE1] text-[#006B31]'
                  }`}
                >
                  <Icon size={15} strokeWidth={2.2} />
                </span>
              ) : (
                <Icon size={19} strokeWidth={isActive ? 2.4 : 1.9} />
              )}
              <span className="text-[10px] font-semibold leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      {txModalOpen && (
        <TransactionModal
          accounts={state.accounts}
          initialTx={editingTx}
          onClose={() => {
            setTxModalOpen(false);
            setEditingTx(null);
          }}
          onSave={handleSaveTransaction}
          onDelete={handleDeleteTransaction}
        />
      )}

      {transferModalOpen && (
        <TransferModal
          accounts={state.accounts}
          onClose={() => setTransferModalOpen(false)}
          onTransfer={handleTransfer}
        />
      )}

      {contributingGoal && (
        <ContributeGoalModal
          goal={contributingGoal}
          accounts={state.accounts}
          onClose={() => setContributingGoal(null)}
          onContribute={handleContributeGoal}
        />
      )}

      {createGoalModalOpen && (
        <CreateGoalModal
          onClose={() => setCreateGoalModalOpen(false)}
          onCreate={handleCreateGoal}
        />
      )}

      {budgetModalOpen && (
        <BudgetModal
          initialBudget={editingBudget}
          existingCategories={state.budgets.map((b) => b.category)}
          onClose={() => {
            setBudgetModalOpen(false);
            setEditingBudget(null);
          }}
          onSave={handleSaveBudget}
        />
      )}

      {/* Breeze Inverse Snackbar Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-[#1C1E20] text-[#FFFFFF] text-[14px] font-semibold shadow-lg whitespace-nowrap"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
