import { ArrowLeftRight, ArrowRight, Plus, ScanLine, Sparkles, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buildNetWorthSeries } from '../data/seedData';
import {
  Account,
  CategoryBudget,
  PlanSubTab,
  RecurringBill,
  SavingsGoal,
  ScreenTab,
  TimeframeOption,
  Transaction,
} from '../types/breeze';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { AccountIcon, CategoryIcon, getCategoryIconBg } from './CategoryIcon';
import { NetWorthChart } from './NetWorthChart';
import { TransactionRow } from './TransactionRow';

interface OverviewScreenProps {
  accounts: Account[];
  transactions: Transaction[];
  budgets: CategoryBudget[];
  bills: RecurringBill[];
  goals: SavingsGoal[];
  headlineTip: string;
  insightsLoading: boolean;
  onNavigate: (tab: ScreenTab, planSubTab?: PlanSubTab) => void;
  onOpenNewTransaction: () => void;
  onOpenTransfer: () => void;
  onOpenNewGoal: () => void;
  onOpenAiDrawer: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  onSelectAccount: (accountId: string) => void;
  onPayBill: (billId: string) => void;
}

export function OverviewScreen({
  accounts,
  transactions,
  budgets,
  bills,
  goals,
  headlineTip,
  insightsLoading,
  onNavigate,
  onOpenNewTransaction,
  onOpenTransfer,
  onOpenNewGoal,
  onOpenAiDrawer,
  onSelectTransaction,
  onSelectAccount,
  onPayBill,
}: OverviewScreenProps) {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1M');

  const { netWorth, cashTotal, investTotal, creditBalance } = useMemo(() => {
    let cash = 0;
    let invest = 0;
    let credit = 0;
    for (const acc of accounts) {
      if (acc.includeInNetWorth === false) continue;
      if (acc.type === 'checking' || acc.type === 'savings') cash += acc.balance;
      else if (acc.type === 'investment') invest += acc.balance;
      else if (acc.type === 'credit' || acc.type === 'loan') credit += acc.balance;
    }
    return {
      netWorth: cash + invest + credit,
      cashTotal: cash,
      investTotal: invest,
      creditBalance: Math.abs(credit),
    };
  }, [accounts]);

  const series = useMemo(
    () => buildNetWorthSeries(netWorth, cashTotal, investTotal, timeframe),
    [netWorth, cashTotal, investTotal, timeframe]
  );

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [transactions]
  );

  const budgetProgress = useMemo(() => {
    const spentByCat = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.date.startsWith('2026-11')) {
        spentByCat.set(
          tx.category,
          (spentByCat.get(tx.category) || 0) + tx.amount
        );
      }
    }
    const items = budgets.map((b) => {
      const spent = spentByCat.get(b.category) || 0;
      const pct = b.limit > 0 ? Math.min(100, (spent / b.limit) * 100) : 0;
      return { ...b, spent, pct };
    });
    const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = items.reduce((sum, b) => sum + b.spent, 0);
    return {
      totalLimit,
      totalSpent,
      remaining: Math.max(0, totalLimit - totalSpent),
      topCategories: items.slice(0, 3),
    };
  }, [budgets, transactions]);

  const upcomingBills = useMemo(
    () => bills.filter((b) => !b.paidThisCycle).slice(0, 3),
    [bills]
  );

  const featuredGoal = goals[0];

  return (
    <div className="space-y-8">
      {/* Proactive AI Advisor Strip */}
      <section className="breeze-card rounded-[20px] px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-[14px] bg-[#DBFCE1] flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-[#00A24E]" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#006B31]">
              Breeze Advisor Insight
            </p>
            <p className="text-[14px] font-medium text-[#181A1C] truncate sm:whitespace-normal">
              {insightsLoading
                ? 'Analyzing your live cash flow, accounts, and goals...'
                : headlineTip ||
                  'Ask Breeze Advisor to scan receipts, categorize bank statements, or optimize your monthly cash flow.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenAiDrawer}
            className="h-10 px-4 rounded-full bg-[#DBFCE1] hover:bg-[#c8f9d1] text-[#006B31] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <ScanLine size={15} />
            <span>Scan / Chat AI</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('advice')}
            className="h-10 px-4 rounded-full bg-[#F3F5F7] hover:bg-[#E2E4E7] text-[#181A1C] text-[13px] font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>All Advice</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </section>
      {/* Hero Net Worth & Interactive Trend */}
      <section className="breeze-summary-wash rounded-[24px] p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            <div>
              <p className="text-[12px] font-semibold tracking-[0.04em] uppercase text-[#66686D]">
                Total Net Worth
              </p>
              <h1 className="mt-1.5 text-[32px] sm:text-[40px] font-extrabold leading-[40px] sm:leading-[48px] tracking-[-0.03em] text-[#181A1C] tabular-nums">
                {formatCurrency(netWorth)}
              </h1>
              <p className="mt-2 text-[14px] text-[#66686D]">
                <span className="font-semibold text-[#159A49] tabular-nums">
                  +$3,420.00
                </span>{' '}
                <span>· +2.45% this month</span>
              </p>
            </div>

            {/* Clean inline breakdown without nested cards */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E2E4E7]/80">
              <div>
                <p className="text-[12px] font-medium text-[#66686D]">
                  Liquid Cash
                </p>
                <p className="mt-0.5 text-[16px] font-bold text-[#181A1C] tabular-nums">
                  {formatCurrency(cashTotal, false)}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-medium text-[#66686D]">
                  Investments
                </p>
                <p className="mt-0.5 text-[16px] font-bold text-[#181A1C] tabular-nums">
                  {formatCurrency(investTotal, false)}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-medium text-[#66686D]">
                  Card Balance
                </p>
                <p className="mt-0.5 text-[16px] font-bold text-[#181A1C] tabular-nums">
                  {formatCurrency(creditBalance, false)}
                </p>
              </div>
            </div>

            {/* Quick Action Pills */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenNewTransaction}
                className="h-12 px-6 rounded-full bg-[#00A24E] hover:bg-[#159A49] text-[#FFFFFF] text-[14px] font-semibold inline-flex items-center gap-2 breeze-fab-shadow transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus size={18} />
                <span>Add Transaction</span>
              </button>
              <button
                type="button"
                onClick={onOpenTransfer}
                className="h-12 px-5 rounded-full bg-[#DBFCE1] hover:bg-[#c8f9d1] text-[#006B31] text-[14px] font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeftRight size={16} />
                <span>Transfer</span>
              </button>
              <button
                type="button"
                onClick={onOpenNewGoal}
                className="h-12 px-5 rounded-full bg-[#FFFFFF] border border-[#E2E4E7] hover:bg-[#F3F5F7] text-[#181A1C] text-[14px] font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Target size={16} />
                <span>New Goal</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#FFFFFF]/90 rounded-[20px] p-4 sm:p-5">
            <NetWorthChart
              points={series}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />
          </div>
        </div>
      </section>

      {/* Connected Accounts Strip */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold leading-[24px] tracking-[-0.01em] text-[#181A1C]">
            Accounts
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('accounts')}
            className="min-h-[40px] px-2 text-[14px] font-semibold text-[#00A24E] hover:text-[#159A49] inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Configure accounts</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => onSelectAccount(acc.id)}
              className="breeze-card rounded-[24px] p-5 text-left transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="w-10 h-10 rounded-[14px] bg-[#F3F5F7] flex items-center justify-center">
                  <AccountIcon type={acc.type} size={18} />
                </div>
                {acc.apyOrApr && (
                  <span className="text-[12px] font-semibold text-[#66686D]">
                    {acc.apyOrApr}
                  </span>
                )}
              </div>

              <div className="mt-4">
                <p className="text-[14px] font-semibold text-[#181A1C] truncate">
                  {acc.name}
                </p>
                <p className="text-[13px] text-[#66686D] truncate">
                  {acc.institution} · ••{acc.lastFour}
                </p>
              </div>

              <p className="mt-3 text-[22px] font-bold leading-[28px] tracking-[-0.015em] text-[#181A1C] tabular-nums">
                {formatCurrency(acc.balance)}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Main Dashboard Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Recent Activity */}
        <section className="lg:col-span-7 breeze-card rounded-[24px] p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3 px-2">
            <div>
              <h2 className="text-[18px] font-semibold leading-[24px] tracking-[-0.01em] text-[#181A1C]">
                Recent Activity
              </h2>
              <p className="text-[13px] text-[#66686D]">
                Click any transaction to inspect or edit details
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('activity')}
              className="min-h-[40px] px-3 rounded-full bg-[#F3F5F7] hover:bg-[#e7eaee] text-[13px] font-semibold text-[#181A1C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              See all
            </button>
          </div>

          <div className="space-y-1.5">
            {recentTransactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                accounts={accounts}
                onSelect={onSelectTransaction}
                showDate
              />
            ))}
          </div>
        </section>

        {/* Right 5 Columns: Budget Pulse + Upcoming Bills + Featured Goal */}
        <div className="lg:col-span-5 space-y-6">
          {/* Monthly Budget Pulse */}
          <section className="breeze-card rounded-[24px] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[18px] font-semibold leading-[24px] tracking-[-0.01em] text-[#181A1C]">
                  November Budget
                </h2>
                <p className="text-[13px] text-[#66686D] tabular-nums">
                  {formatCurrency(budgetProgress.remaining, false)} remaining of{' '}
                  {formatCurrency(budgetProgress.totalLimit, false)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('plan', 'budgets')}
                className="min-h-[40px] px-3 rounded-full bg-[#DBFCE1] hover:bg-[#c8f9d1] text-[13px] font-semibold text-[#006B31] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Manage
              </button>
            </div>

            <div className="space-y-4">
              {budgetProgress.topCategories.map((cat) => {
                const barColor =
                  cat.pct >= 95
                    ? 'bg-[#D32F34]'
                    : cat.pct >= 75
                    ? 'bg-[#EBA650]'
                    : 'bg-[#00A24E]';
                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center justify-between text-[14px]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 ${getCategoryIconBg(
                            cat.category
                          )}`}
                        >
                          <CategoryIcon category={cat.category} size={16} />
                        </span>
                        <span className="font-semibold text-[#181A1C] truncate">
                          {cat.category}
                        </span>
                      </div>
                      <span className="text-[#66686D] tabular-nums shrink-0">
                        <strong className="font-semibold text-[#181A1C]">
                          {formatCurrency(cat.spent, false)}
                        </strong>{' '}
                        / {formatCurrency(cat.limit, false)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#F3F5F7] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Upcoming Bills */}
          <section className="breeze-card rounded-[24px] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-semibold leading-[24px] tracking-[-0.01em] text-[#181A1C]">
                Upcoming Bills
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('plan', 'budgets')}
                className="min-h-[40px] px-2 text-[13px] font-semibold text-[#5A52AF] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                All recurring
              </button>
            </div>

            {upcomingBills.length === 0 ? (
              <p className="text-[14px] text-[#66686D] py-3">
                All bills for this cycle are settled.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between gap-3 py-1"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[#181A1C] truncate">
                        {bill.name}
                      </p>
                      <p className="text-[13px] text-[#66686D]">
                        Due {formatShortDate(bill.dueDate)} ·{' '}
                        {bill.autoPay ? 'Auto-pay on' : 'Manual pay'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[15px] font-semibold text-[#181A1C] tabular-nums">
                        {formatCurrency(bill.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onPayBill(bill.id)}
                        className="min-h-[36px] px-3.5 rounded-full bg-[#F3F5F7] hover:bg-[#DBFCE1] hover:text-[#006B31] text-[12px] font-semibold text-[#181A1C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Pay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Featured Lifestyle Goal */}
          {featuredGoal && (
            <button
              type="button"
              onClick={() => onNavigate('plan', 'goals')}
              className="relative w-full h-56 rounded-[24px] overflow-hidden text-left group cursor-pointer block"
            >
              <img
                src={featuredGoal.imageUrl}
                alt={featuredGoal.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 breeze-scrim" />
              <div className="relative h-full p-5 flex flex-col justify-between text-[#FFFFFF]">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold tracking-[0.02em] bg-[#FFFFFF]/20 backdrop-blur-md px-3 py-1 rounded-full">
                    Featured Goal · {featuredGoal.targetDate}
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums">
                    {Math.round(
                      (featuredGoal.savedAmount / featuredGoal.targetAmount) *
                        100
                    )}
                    % funded
                  </span>
                </div>

                <div>
                  <h3 className="text-[20px] font-bold leading-[26px]">
                    {featuredGoal.title}
                  </h3>
                  <p className="mt-1 text-[13px] text-[#FFFFFF]/85 tabular-nums">
                    {formatCurrency(featuredGoal.savedAmount, false)} saved of{' '}
                    {formatCurrency(featuredGoal.targetAmount, false)}
                  </p>
                  <div className="mt-3 h-2 w-full rounded-full bg-[#FFFFFF]/25 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#5DDF83]"
                      style={{
                        width: `${Math.min(
                          100,
                          (featuredGoal.savedAmount /
                            featuredGoal.targetAmount) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
