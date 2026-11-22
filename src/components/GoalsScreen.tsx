import { Plus, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { Account, SavingsGoal } from '../types/breeze';
import { formatCurrency } from '../utils/formatters';

interface GoalsScreenProps {
  goals: SavingsGoal[];
  accounts: Account[];
  onContributeGoal: (goal: SavingsGoal) => void;
  onCreateGoal: () => void;
}

export function GoalsScreen({
  goals,
  accounts,
  onContributeGoal,
  onCreateGoal,
}: GoalsScreenProps) {
  const { totalSaved, totalTarget, monthlyTotal, allocation } = useMemo(() => {
    const saved = goals.reduce((s, g) => s + g.savedAmount, 0);
    const target = goals.reduce((s, g) => s + g.targetAmount, 0);
    const monthly = goals.reduce((s, g) => s + g.monthlyTarget, 0);

    let checking = 0;
    let savings = 0;
    let invest = 0;
    for (const acc of accounts) {
      if (acc.type === 'checking') checking += Math.max(0, acc.balance);
      else if (acc.type === 'savings') savings += Math.max(0, acc.balance);
      else if (acc.type === 'investment') invest += Math.max(0, acc.balance);
    }
    const grossAssets = Math.max(checking + savings + invest, 1);

    return {
      totalSaved: saved,
      totalTarget: target,
      monthlyTotal: monthly,
      allocation: [
        {
          label: 'Core Investments',
          amount: invest,
          pct: Math.round((invest / grossAssets) * 100),
          color: 'bg-[#5A52AF]',
        },
        {
          label: 'High-Yield Reserve & Goals',
          amount: savings,
          pct: Math.round((savings / grossAssets) * 100),
          color: 'bg-[#00A24E]',
        },
        {
          label: 'Everyday Checking',
          amount: checking,
          pct: Math.round((checking / grossAssets) * 100),
          color: 'bg-[#EBA650]',
        },
      ],
    };
  }, [goals, accounts]);

  const overallPct =
    totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-[36px] tracking-[-0.02em] text-[#181A1C]">
            Savings Goals & Allocation
          </h1>
          <p className="mt-1 text-[14px] text-[#66686D]">
            Dedicated lifestyle funds growing alongside your core reserves
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateGoal}
          className="h-11 px-5 rounded-full bg-[#00A24E] hover:bg-[#159A49] text-[#FFFFFF] text-[14px] font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>New Goal</span>
        </button>
      </div>

      {/* Summary Bar */}
      <section className="breeze-summary-wash rounded-[24px] p-6 sm:p-7 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#66686D]">
            Total Saved Toward Goals
          </p>
          <p className="mt-1 text-[32px] font-bold leading-[38px] tracking-[-0.02em] text-[#181A1C] tabular-nums">
            {formatCurrency(totalSaved, false)}
          </p>
          <p className="mt-1 text-[14px] text-[#66686D] tabular-nums">
            {overallPct}% of {formatCurrency(totalTarget, false)} total target
          </p>
        </div>

        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#66686D]">
            Monthly Auto-Contribution
          </p>
          <p className="mt-1 text-[26px] font-bold leading-[32px] tracking-[-0.02em] text-[#00A24E] tabular-nums">
            +{formatCurrency(monthlyTotal, false)}/mo
          </p>
          <p className="mt-1 text-[14px] text-[#66686D]">
            Across {goals.length} active lifestyle goals
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px] font-semibold text-[#181A1C]">
            <span>Combined Goal Progress</span>
            <span className="tabular-nums">{overallPct}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-[#FFFFFF]/80 overflow-hidden border border-[#E2E4E7]/60">
            <div
              className="h-full rounded-full bg-[#00A24E] transition-all duration-300"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Lifestyle Photo Goal Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const pct =
            goal.targetAmount > 0
              ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
              : 0;
          const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
          const isFunded = remaining === 0;

          return (
            <article
              key={goal.id}
              className="relative h-[320px] rounded-[24px] overflow-hidden breeze-card group"
            >
              <img
                src={goal.imageUrl}
                alt={goal.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 breeze-scrim" />

              <div className="relative h-full p-6 flex flex-col justify-between text-[#FFFFFF]">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-[#181A1C]/45 backdrop-blur-md text-[12px] font-semibold">
                    Target · {goal.targetDate}
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-[#DBFCE1] text-[#006B31] text-[12px] font-bold tabular-nums">
                    {pct}% funded
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <h2 className="text-[22px] font-bold leading-[28px] tracking-[-0.015em]">
                      {goal.title}
                    </h2>
                    <p className="text-[14px] text-[#FFFFFF]/85">
                      {goal.subtitle}
                    </p>
                  </div>

                  <div className="h-2 w-full rounded-full bg-[#FFFFFF]/25 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#5DDF83] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div>
                      <p className="text-[18px] font-bold tabular-nums">
                        {formatCurrency(goal.savedAmount, false)}{' '}
                        <span className="text-[14px] font-medium text-[#FFFFFF]/80">
                          / {formatCurrency(goal.targetAmount, false)}
                        </span>
                      </p>
                      <p className="text-[12px] text-[#FFFFFF]/80 tabular-nums">
                        {isFunded
                          ? 'Goal fully funded'
                          : `${formatCurrency(remaining, false)} to go · +${formatCurrency(
                              goal.monthlyTarget,
                              false
                            )}/mo`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onContributeGoal(goal)}
                      className="h-10 px-4 rounded-full bg-[#FFFFFF] hover:bg-[#DBFCE1] text-[#181A1C] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isFunded ? (
                        <>
                          <Sparkles size={14} className="text-[#00A24E]" />
                          <span>Add Bonus</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} className="text-[#00A24E]" />
                          <span>Contribute</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Asset & Reserve Allocation */}
      <section className="breeze-card rounded-[24px] p-6">
        <h2 className="text-[18px] font-semibold leading-[24px] tracking-[-0.01em] text-[#181A1C]">
          Gross Asset Allocation
        </h2>
        <p className="mt-1 text-[13px] text-[#66686D]">
          How your liquid cash, goal reserves, and investments work together
        </p>

        <div className="mt-5 h-3.5 w-full rounded-full bg-[#F3F5F7] overflow-hidden flex gap-0.5">
          {allocation.map((slice) => (
            <div
              key={slice.label}
              className={`h-full ${slice.color} transition-all duration-300`}
              style={{ width: `${slice.pct}%` }}
              title={`${slice.label}: ${slice.pct}%`}
            />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {allocation.map((slice) => (
            <div
              key={slice.label}
              className="rounded-[18px] bg-[#F3F5F7] p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-3 h-3 rounded-full shrink-0 ${slice.color}`} />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#181A1C] truncate">
                    {slice.label}
                  </p>
                  <p className="text-[12px] text-[#66686D] tabular-nums">
                    {slice.pct}% of assets
                  </p>
                </div>
              </div>
              <span className="text-[15px] font-bold text-[#181A1C] tabular-nums shrink-0">
                {formatCurrency(slice.amount, false)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
