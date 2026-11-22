import {
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  AdvisorChatMessage,
  AdvisorInsight,
  BreezeState,
  ExtractedTransactionDraft,
} from '../types/breeze';
import { formatCurrency } from '../utils/formatters';
import { AiChatPanel } from './AiChatPanel';

interface AdviceScreenProps {
  state: BreezeState;
  insights: AdvisorInsight[];
  headlineTip: string;
  insightsLoading: boolean;
  insightsError: string | null;
  language: 'en' | 'es';
  onLanguageChange: (lang: 'en' | 'es') => void;
  onRefreshInsights: () => void;
  chatMessages: AdvisorChatMessage[];
  onChatMessagesChange: React.Dispatch<
    React.SetStateAction<AdvisorChatMessage[]>
  >;
  onCommitTransactions: (drafts: ExtractedTransactionDraft[]) => void;
}

export function AdviceScreen({
  state,
  insights,
  headlineTip,
  insightsLoading,
  insightsError,
  language,
  onLanguageChange,
  onRefreshInsights,
  chatMessages,
  onChatMessagesChange,
  onCommitTransactions,
}: AdviceScreenProps) {
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);

  const vitals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const tx of state.transactions) {
      if (tx.date.startsWith('2026-11')) {
        if (tx.type === 'income') income += tx.amount;
        if (tx.type === 'expense') expenses += tx.amount;
      }
    }
    const surplus = income - expenses;
    const savingsRate = income > 0 ? Math.round((surplus / income) * 100) : 0;

    let liquidCash = 0;
    let creditDebt = 0;
    let creditLimit = 0;
    for (const acc of state.accounts) {
      if (acc.type === 'checking' || acc.type === 'savings') {
        liquidCash += Math.max(0, acc.balance);
      } else if (acc.type === 'credit') {
        creditDebt += Math.abs(Math.min(0, acc.balance));
        creditLimit += acc.creditLimit || 0;
      }
    }

    const monthlyBurn = Math.max(expenses, 2500);
    const runwayMonths = Math.round((liquidCash / monthlyBurn) * 10) / 10;
    const utilization =
      creditLimit > 0 ? Math.round((creditDebt / creditLimit) * 100) : 0;

    return {
      savingsRate,
      surplus,
      runwayMonths,
      utilization,
    };
  }, [state]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-[36px] tracking-[-0.02em] text-[#181A1C]">
            Financial Advice & AI Scanner
          </h1>
          <p className="mt-1 text-[14px] text-[#66686D]">
            Continuous advisor insights, tailored recommendations, and receipt/statement parsing
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center p-1 rounded-full bg-[#F3F5F7]">
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`min-h-[34px] px-3 rounded-full text-[12px] font-semibold cursor-pointer ${
                language === 'en'
                  ? 'bg-[#181A1C] text-[#FFFFFF]'
                  : 'text-[#66686D]'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('es')}
              className={`min-h-[34px] px-3 rounded-full text-[12px] font-semibold cursor-pointer ${
                language === 'es'
                  ? 'bg-[#181A1C] text-[#FFFFFF]'
                  : 'text-[#66686D]'
              }`}
            >
              ES
            </button>
          </div>

          <button
            type="button"
            onClick={onRefreshInsights}
            disabled={insightsLoading}
            className="h-11 px-4 rounded-full bg-[#FFFFFF] border border-[#E2E4E7] hover:bg-[#F3F5F7] text-[13px] font-semibold text-[#181A1C] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              size={15}
              className={insightsLoading ? 'animate-spin text-[#00A24E]' : ''}
            />
            <span>Refresh Insights</span>
          </button>
        </div>
      </div>

      {/* Proactive Advisor Banner + Live Ratios */}
      <section className="breeze-summary-wash rounded-[24px] p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#00A24E] text-[#FFFFFF] flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#006B31]">
              Live Advisor Pulse
            </p>
            <p className="mt-0.5 text-[16px] font-semibold leading-[23px] text-[#181A1C]">
              {insightsLoading
                ? 'Analyzing your accounts, budgets, and goals...'
                : headlineTip ||
                  'Click Refresh Insights to generate a tailored pulse from your live portfolio.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#E2E4E7]/80">
          <div>
            <p className="text-[12px] font-medium text-[#66686D]">
              Nov Savings Rate
            </p>
            <p className="mt-0.5 text-[22px] font-bold text-[#181A1C] tabular-nums">
              {vitals.savingsRate}%
            </p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#66686D]">
              Monthly Surplus
            </p>
            <p className="mt-0.5 text-[22px] font-bold text-[#00A24E] tabular-nums">
              {formatCurrency(vitals.surplus, false)}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#66686D]">
              Emergency Runway
            </p>
            <p className="mt-0.5 text-[22px] font-bold text-[#181A1C] tabular-nums">
              {vitals.runwayMonths} mo
            </p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#66686D]">
              Credit Utilization
            </p>
            <p className="mt-0.5 text-[22px] font-bold text-[#181A1C] tabular-nums">
              {vitals.utilization}%
            </p>
          </div>
        </div>
      </section>

      {/* Main Two-Column Advice + Chat Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Columns: Actionable Insight Cards */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-[#181A1C]">
              Personalized Recommendations
            </h2>
          </div>

          {insightsError && (
            <div className="rounded-[20px] bg-[#ffdad6] text-[#93000a] p-4 text-[13px] font-medium">
              {insightsError}
            </div>
          )}

          {insightsLoading && insights.length === 0 ? (
            <div className="breeze-card rounded-[24px] p-8 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 size={24} className="animate-spin text-[#00A24E]" />
              <p className="text-[14px] text-[#66686D]">
                Reviewing your cash flow, budgets, and goals...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((ins) => {
                const badgeClass =
                  ins.priority === 'attention'
                    ? 'bg-[#FDF3E7] text-[#C97D00]'
                    : ins.priority === 'opportunity'
                    ? 'bg-[#EFEFFE] text-[#5A52AF]'
                    : 'bg-[#DBFCE1] text-[#006B31]';

                return (
                  <article
                    key={ins.id}
                    className="breeze-card rounded-[24px] p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.03em] ${badgeClass}`}
                      >
                        {ins.category}
                      </span>
                      <span className="text-[12px] font-bold text-[#181A1C] tabular-nums">
                        {ins.impactLabel}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-[16px] font-bold text-[#181A1C]">
                        {ins.title}
                      </h3>
                      <p className="mt-1 text-[14px] leading-[20px] text-[#66686D]">
                        {ins.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setQueuedPrompt(ins.suggestedQuestion)}
                      className="min-h-[36px] px-3.5 rounded-full bg-[#F3F5F7] hover:bg-[#DBFCE1] hover:text-[#006B31] text-[12px] font-semibold text-[#181A1C] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Ask Advisor about this</span>
                      <ArrowUpRight size={14} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Right 7 Columns: Interactive AI Chat & Receipt/Statement Scanner */}
        <section className="lg:col-span-7">
          <AiChatPanel
            state={state}
            messages={chatMessages}
            onMessagesChange={onChatMessagesChange}
            onCommitTransactions={onCommitTransactions}
            pendingPrompt={queuedPrompt}
            onConsumePendingPrompt={() => setQueuedPrompt(null)}
          />
        </section>
      </div>
    </div>
  );
}
