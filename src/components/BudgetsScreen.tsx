import { CheckCircle2, Plus, SlidersHorizontal } from 'lucide-react';
import { useMemo } from 'react';
import {
  Account,
  CategoryBudget,
  RecurringBill,
  Transaction,
} from '../types/breeze';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { CategoryIcon, getCategoryIconBg } from './CategoryIcon';

interface BudgetsScreenProps {
  budgets: CategoryBudget[];
  bills: RecurringBill[];
  transactions: Transaction[];
  accounts: Account[];
  onEditBudget: (budget: CategoryBudget) => void;
  onAddBudget: () => void;
  onToggleBillAutoPay: (billId: string) => void;
  onPayBill: (billId: string) => void;
}

export function BudgetsScreen({
  budgets,
  bills,
  transactions,
  accounts,
  onEditBudget,
  onAddBudget,
  onToggleBillAutoPay,
  onPayBill,
}: BudgetsScreenProps) {
  const {
    budgetItems,
    totalLimit,
    totalSpent,
    remaining,
    dailyAllowance,
    essentialsSpent,
    recurringSpent,
    discretionarySpent,
  } = useMemo(() => {
    const spentMap = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.date.startsWith('2026-11')) {
        spentMap.set(tx.category, (spentMap.get(tx.category) || 0) + tx.amount);
      }
    }

    const items = budgets.map((b) => {
      const spent = spentMap.get(b.category) || 0;
      const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
      return {
        ...b,
        spent,
        pct,
        clampedPct: Math.min(100, pct),
        remaining: b.limit - spent,
      };
    });

    const limitSum = items.reduce((s, i) => s + i.limit, 0);
    const spentSum = items.reduce((s, i) => s + i.spent, 0);
    const rem = Math.max(0, limitSum - spentSum);
    // Nov 21 -> 9 days remaining in November (Nov 22..30) + today = 10 days
    const daysLeft = 10;

    let essentials = 0;
    let recurring = 0;
    let discretionary = 0;
    for (const item of items) {
      if (
        item.category === 'Home & Utilities' ||
        item.category === 'Groceries'
      ) {
        essentials += item.spent;
      } else if (
        item.category === 'Subscriptions' ||
        item.category === 'Wellness'
      ) {
        recurring += item.spent;
      } else {
        discretionary += item.spent;
      }
    }

    return {
      budgetItems: items,
      totalLimit: limitSum,
      totalSpent: spentSum,
      remaining: rem,
      dailyAllowance: rem / daysLeft,
      essentialsSpent: essentials,
      recurringSpent: recurring,
      discretionarySpent: discretionary,
    };
  }, [budgets, transactions]);

  const ringRadius = 56;
  const circumference = 2 * Math.PI * ringRadius;
  const totalRingDenom = Math.max(totalLimit, totalSpent, 1);
  const essentialsDash = (essentialsSpent / totalRingDenom) * circumference;
  const recurringDash = (recurringSpent / totalRingDenom) * circumference;
  const discretionaryDash =
    (discretionarySpent / totalRingDenom) * circumference;

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-[36px] tracking-[-0.02em] text-[#181A1C]">
            Budgets & Recurring Bills
          </h1>
          <p className="mt-1 text-[14px] text-[#66686D]">
            November 2026 spending plan · Tracked live from your activity
          </p>
        </div>

        <button
          type="button"
          onClick={onAddBudget}
          className="h-11 px-5 rounded-full bg-[#00A24E] hover:bg-[#159A49] text-[#FFFFFF] text-[14px] font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>New Category Budget</span>
        </button>
      </div>

      {/* Monthly Spend Ring & Safe-to-Spend Summary */}
      <section className="breeze-card rounded-[24px] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-5 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
              <circle
                cx="70"
                cy="70"
                r={ringRadius}
                fill="none"
                stroke="#F3F5F7"
                strokeWidth="14"
              />
              {/* Essentials (#00A24E) */}
              <circle
                cx="70"
                cy="70"
                r={ringRadius}
                fill="none"
                stroke="#00A24E"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${essentialsDash} ${circumference}`}
                strokeDashoffset={0}
              />
              {/* Recurring (#7A72D1) */}
              <circle
                cx="70"
                cy="70"
                r={ringRadius}
                fill="none"
                stroke="#7A72D1"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${recurringDash} ${circumference}`}
                strokeDashoffset={-essentialsDash}
              />
              {/* Discretionary (#EBA650) */}
              <circle
                cx="70"
                cy="70"
                r={ringRadius}
                fill="none"
                stroke="#EBA650"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${discretionaryDash} ${circumference}`}
                strokeDashoffset={-(essentialsDash + recurringDash)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#66686D]">
                Spent
              </span>
              <span className="text-[20px] font-bold text-[#181A1C] tabular-nums">
                {totalLimit > 0
                  ? Math.round((totalSpent / totalLimit) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#66686D]">
              Left This Month
            </p>
            <p className="mt-1 text-[32px] font-bold leading-[38px] tracking-[-0.02em] text-[#181A1C] tabular-nums">
              {formatCurrency(remaining)}
            </p>
            <p className="mt-1.5 text-[14px] text-[#66686D] tabular-nums">
              {formatCurrency(totalSpent)} spent of{' '}
              {formatCurrency(totalLimit)}
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-5 pt-6 lg:pt-0 lg:border-l lg:border-[#E2E4E7] lg:pl-8">
          <div className="rounded-[20px] bg-[#F3F5F7] p-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00A24E]" />
              <span className="text-[13px] font-semibold text-[#181A1C]">
                Essentials
              </span>
            </div>
            <p className="mt-2 text-[20px] font-bold text-[#181A1C] tabular-nums">
              {formatCurrency(essentialsSpent, false)}
            </p>
            <p className="text-[12px] text-[#66686D]">Home & groceries</p>
          </div>

          <div className="rounded-[20px] bg-[#F3F5F7] p-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7A72D1]" />
              <span className="text-[13px] font-semibold text-[#181A1C]">
                Recurring
              </span>
            </div>
            <p className="mt-2 text-[20px] font-bold text-[#181A1C] tabular-nums">
              {formatCurrency(recurringSpent, false)}
            </p>
            <p className="text-[12px] text-[#66686D]">Wellness & plans</p>
          </div>

          <div className="rounded-[20px] bg-[#DBFCE1]/75 p-4">
            <span className="text-[13px] font-semibold text-[#006B31]">
              Daily Safe-to-Spend
            </span>
            <p className="mt-2 text-[20px] font-bold text-[#006B31] tabular-nums">
              {formatCurrency(dailyAllowance)}
            </p>
            <p className="text-[12px] text-[#006B31]/80">
              For next 10 days of Nov
            </p>
          </div>
        </div>
      </section>

      {/* Category Budget Progress Tiles */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold leading-[24px] tracking-[-0.01em] text-[#181A1C]">
            Category Limits
          </h2>
          <span className="text-[13px] text-[#66686D]">
            Click any tile to adjust cap
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetItems.map((item) => {
            const isOver = item.pct >= 100;
            const isNear = item.pct >= 75 && item.pct < 100;
            const barColor = isOver
              ? 'bg-[#D32F34]'
              : isNear
              ? 'bg-[#EBA650]'
              : item.accent === 'secondary'
              ? 'bg-[#7A72D1]'
              : 'bg-[#00A24E]';

            const statusText = isOver
              ? 'Over budget'
              : isNear
              ? 'Approaching cap'
              : 'On track';
            const statusColor = isOver
              ? 'text-[#D32F34]'
              : isNear
              ? 'text-[#C97D00]'
              : 'text-[#159A49]';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onEditBudget(item)}
                className="breeze-card rounded-[24px] p-5 text-left transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${getCategoryIconBg(
                        item.category
                      )}`}
                    >
                      <CategoryIcon category={item.category} size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[#181A1C] truncate">
                        {item.category}
                      </p>
                      <p className={`text-[12px] font-semibold ${statusColor}`}>
                        {statusText}
                      </p>
                    </div>
                  </div>
                  <SlidersHorizontal
                    size={16}
                    className="text-[#66686D] opacity-60 group-hover:opacity-100 shrink-0"
                  />
                </div>

                <div className="mt-5">
                  <div className="flex items-baseline justify-between text-[14px] mb-2">
                    <span className="font-bold text-[#181A1C] tabular-nums">
                      {formatCurrency(item.spent)}
                    </span>
                    <span className="text-[#66686D] tabular-nums">
                      of {formatCurrency(item.limit, false)}
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-[#F3F5F7] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${item.clampedPct}%` }}
                    />
                  </div>

                  <p className="mt-2.5 text-[12px] text-[#66686D] tabular-nums">
                    {item.remaining >= 0
                      ? `${formatCurrency(item.remaining)} remaining`
                      : `${formatCurrency(Math.abs(item.remaining))} over limit`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recurring Bills & Subscriptions */}
      <section className="breeze-card rounded-[24px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-[18px] font-semibold leading-[24px] tracking-[-0.01em] text-[#181A1C]">
              Recurring Bills & Subscriptions
            </h2>
            <p className="text-[13px] text-[#66686D]">
              Toggle auto-pay reminders or settle upcoming bills early
            </p>
          </div>
          <span className="text-[14px] font-semibold text-[#5A52AF] tabular-nums">
            {formatCurrency(
              bills.reduce((sum, b) => sum + b.amount, 0)
            )}{' '}
            / month
          </span>
        </div>

        <div className="divide-y divide-[#E2E4E7]/70">
          {bills.map((bill) => {
            const acc = accountMap.get(bill.accountId);
            return (
              <div
                key={bill.id}
                className="py-4 first:pt-1 last:pb-1 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 ${getCategoryIconBg(
                      bill.category
                    )}`}
                  >
                    <CategoryIcon category={bill.category} size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#181A1C] truncate">
                      {bill.name}
                    </p>
                    <p className="text-[13px] text-[#66686D] truncate">
                      {bill.provider} · Due {formatShortDate(bill.dueDate)}
                      {acc ? ` · ${acc.name} ••${acc.lastFour}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5 ml-auto">
                  {/* Breeze 48x28 Switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-[#66686D]">
                      Auto-pay
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={bill.autoPay}
                      aria-label={`Toggle auto-pay for ${bill.name}`}
                      onClick={() => onToggleBillAutoPay(bill.id)}
                      className={`relative w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer ${
                        bill.autoPay ? 'bg-[#00A24E]' : 'bg-[#E2E4E7]'
                      }`}
                    >
                      <span
                        className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full bg-[#FFFFFF] shadow-sm transition-transform duration-200 ${
                          bill.autoPay ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <span className="text-[16px] font-semibold text-[#181A1C] tabular-nums min-w-[78px] text-right">
                    {formatCurrency(bill.amount)}
                  </span>

                  {bill.paidThisCycle ? (
                    <span className="min-h-[36px] px-3.5 rounded-full bg-[#DBFCE1] text-[#006B31] text-[12px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                      <CheckCircle2 size={14} />
                      <span>Settled</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onPayBill(bill.id)}
                      className="min-h-[36px] px-4 rounded-full bg-[#F3F5F7] hover:bg-[#00A24E] hover:text-[#FFFFFF] text-[13px] font-semibold text-[#181A1C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Pay now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
