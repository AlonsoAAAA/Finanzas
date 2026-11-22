import {
  ArrowUpRight,
  Plus,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Account,
  InvestmentAssetClass,
  InvestmentHolding,
} from '../types/breeze';
import { formatCurrency } from '../utils/formatters';

interface InvestmentsScreenProps {
  holdings: InvestmentHolding[];
  accounts: Account[];
  onBuyOrAddHolding: (params: {
    holdingId?: string;
    ticker: string;
    name: string;
    assetClass: InvestmentAssetClass;
    shares: number;
    price: number;
    fundingAccountId?: string;
    investmentAccountId: string;
  }) => void;
  onUpdateHolding: (holding: InvestmentHolding) => void;
  onDeleteHolding: (holdingId: string) => void;
  onAskAiAboutPortfolio: (prompt: string) => void;
}

const ASSET_CLASS_COLORS: Record<InvestmentAssetClass, string> = {
  'US Equities': 'bg-[#00A24E]',
  International: 'bg-[#7A72D1]',
  'Fixed Income': 'bg-[#EBA650]',
  'Individual Stock': 'bg-[#181A1C]',
  'Cash & Treasury': 'bg-[#94A3B8]',
};

const TARGET_WEIGHTS: Partial<Record<InvestmentAssetClass, number>> = {
  'US Equities': 60,
  International: 20,
  'Fixed Income': 15,
  'Individual Stock': 5,
};

export function InvestmentsScreen({
  holdings,
  accounts,
  onBuyOrAddHolding,
  onUpdateHolding,
  onDeleteHolding,
  onAskAiAboutPortfolio,
}: InvestmentsScreenProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] =
    useState<InvestmentHolding | null>(null);
  const [buyTargetHolding, setBuyTargetHolding] =
    useState<InvestmentHolding | null>(null);

  const investmentAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'investment'),
    [accounts]
  );
  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'checking' || a.type === 'savings'),
    [accounts]
  );

  const metrics = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let dayGainDollar = 0;
    let annualDividends = 0;
    const byClass = new Map<InvestmentAssetClass, number>();

    for (const h of holdings) {
      const value = h.shares * h.currentPrice;
      const cost = h.shares * h.avgCost;
      totalValue += value;
      totalCost += cost;
      dayGainDollar += value * (h.dayChangePct / 100);
      annualDividends += value * (h.dividendYieldPct / 100);
      byClass.set(h.assetClass, (byClass.get(h.assetClass) || 0) + value);
    }

    const totalReturnDollar = totalValue - totalCost;
    const totalReturnPct =
      totalCost > 0 ? (totalReturnDollar / totalCost) * 100 : 0;
    const dayGainPct = totalValue > 0 ? (dayGainDollar / totalValue) * 100 : 0;

    const allocation = Array.from(byClass.entries())
      .map(([assetClass, value]) => ({
        assetClass,
        value,
        pct: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
        targetPct: TARGET_WEIGHTS[assetClass] ?? 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      totalValue,
      totalCost,
      totalReturnDollar,
      totalReturnPct,
      dayGainDollar,
      dayGainPct,
      annualDividends,
      allocation,
    };
  }, [holdings]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-[36px] tracking-[-0.02em] text-[#181A1C]">
            Investments & Portfolio
          </h1>
          <p className="mt-1 text-[14px] text-[#66686D]">
            Track ETFs, equities, fixed income allocation, and projected annual yield
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              onAskAiAboutPortfolio(
                'Analyze my investment portfolio allocation, diversification, and yield. Should I rebalance anything?'
              )
            }
            className="h-11 px-4 rounded-full bg-[#DBFCE1] hover:bg-[#c8f9d1] text-[#006B31] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles size={15} />
            <span>Ask AI about Portfolio</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingHolding(null);
              setBuyTargetHolding(null);
              setModalOpen(true);
            }}
            className="h-11 px-5 rounded-full bg-[#00A24E] hover:bg-[#159A49] text-[#FFFFFF] text-[14px] font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus size={16} />
            <span>Buy / Add Position</span>
          </button>
        </div>
      </div>

      {/* Portfolio Hero Card */}
      <section className="breeze-summary-wash rounded-[24px] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-5 space-y-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#66686D]">
              Total Invested Portfolio
            </p>
            <p className="mt-1 text-[34px] sm:text-[40px] font-extrabold leading-[44px] tracking-[-0.03em] text-[#181A1C] tabular-nums">
              {formatCurrency(metrics.totalValue)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[14px]">
              <span
                className={`font-semibold tabular-nums ${
                  metrics.totalReturnDollar >= 0
                    ? 'text-[#159A49]'
                    : 'text-[#D32F34]'
                }`}
              >
                {metrics.totalReturnDollar >= 0 ? '+' : ''}
                {formatCurrency(metrics.totalReturnDollar)} (
                {metrics.totalReturnPct >= 0 ? '+' : ''}
                {metrics.totalReturnPct.toFixed(2)}% all-time)
              </span>
              <span className="text-[#66686D] tabular-nums">
                · Today {metrics.dayGainDollar >= 0 ? '+' : ''}
                {formatCurrency(metrics.dayGainDollar)} (
                {metrics.dayGainPct >= 0 ? '+' : ''}
                {metrics.dayGainPct.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E2E4E7]/80">
            <div>
              <p className="text-[12px] font-medium text-[#66686D]">
                Cost Basis
              </p>
              <p className="mt-0.5 text-[18px] font-bold text-[#181A1C] tabular-nums">
                {formatCurrency(metrics.totalCost, false)}
              </p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#66686D]">
                Est. Annual Dividends
              </p>
              <p className="mt-0.5 text-[18px] font-bold text-[#00A24E] tabular-nums">
                +{formatCurrency(metrics.annualDividends, false)}/yr
              </p>
            </div>
          </div>
        </div>

        {/* Asset Class Allocation Mix */}
        <div className="lg:col-span-7 bg-[#FFFFFF]/90 rounded-[20px] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-[#181A1C]">
              Asset Class Mix vs. Target
            </h2>
            <span className="text-[12px] text-[#66686D]">
              {holdings.length} active positions
            </span>
          </div>

          <div className="h-3.5 w-full rounded-full bg-[#F3F5F7] overflow-hidden flex gap-0.5">
            {metrics.allocation.map((slice) => (
              <div
                key={slice.assetClass}
                className={`h-full ${
                  ASSET_CLASS_COLORS[slice.assetClass]
                } transition-all duration-300`}
                style={{ width: `${slice.pct}%` }}
                title={`${slice.assetClass}: ${slice.pct}%`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metrics.allocation.map((slice) => (
              <div
                key={slice.assetClass}
                className="rounded-[16px] bg-[#F3F5F7] px-4 py-3 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      ASSET_CLASS_COLORS[slice.assetClass]
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#181A1C] truncate">
                      {slice.assetClass}
                    </p>
                    <p className="text-[11px] text-[#66686D] tabular-nums">
                      {slice.pct}% actual
                      {slice.targetPct > 0 ? ` · ${slice.targetPct}% target` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-[14px] font-bold text-[#181A1C] tabular-nums shrink-0">
                  {formatCurrency(slice.value, false)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Holdings List */}
      <section className="breeze-card rounded-[24px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[18px] font-semibold text-[#181A1C]">
              Holdings
            </h2>
            <p className="text-[13px] text-[#66686D]">
              Buy additional shares from checking/savings or adjust position details
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#E2E4E7]/70">
          {holdings.map((h) => {
            const marketValue = h.shares * h.currentPrice;
            const costTotal = h.shares * h.avgCost;
            const gain = marketValue - costTotal;
            const gainPct = costTotal > 0 ? (gain / costTotal) * 100 : 0;
            const isPositive = gain >= 0;

            return (
              <div
                key={h.id}
                className="py-4 first:pt-1 last:pb-1 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-[220px] flex-1">
                  <div className="w-12 h-12 rounded-[16px] bg-[#F3F5F7] flex items-center justify-center font-mono text-[13px] font-bold text-[#181A1C] shrink-0">
                    {h.ticker}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-[#181A1C] truncate">
                      {h.name}
                    </p>
                    <p className="text-[13px] text-[#66686D] tabular-nums">
                      {h.shares} shares @ {formatCurrency(h.currentPrice)} ·{' '}
                      {h.assetClass} · {h.dividendYieldPct}% yield
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 ml-auto">
                  <div className="text-right">
                    <p className="text-[16px] font-bold text-[#181A1C] tabular-nums">
                      {formatCurrency(marketValue)}
                    </p>
                    <p
                      className={`text-[12px] font-semibold tabular-nums inline-flex items-center gap-1 ${
                        isPositive ? 'text-[#159A49]' : 'text-[#D32F34]'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp size={12} />
                      ) : (
                        <TrendingDown size={12} />
                      )}
                      <span>
                        {isPositive ? '+' : ''}
                        {formatCurrency(gain)} ({isPositive ? '+' : ''}
                        {gainPct.toFixed(1)}%)
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingHolding(null);
                        setBuyTargetHolding(h);
                        setModalOpen(true);
                      }}
                      className="min-h-[36px] px-3.5 rounded-full bg-[#DBFCE1] hover:bg-[#c8f9d1] text-[#006B31] text-[12px] font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      <ArrowUpRight size={13} />
                      <span>Buy</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Edit ${h.ticker}`}
                      onClick={() => {
                        setBuyTargetHolding(null);
                        setEditingHolding(h);
                        setModalOpen(true);
                      }}
                      className="w-9 h-9 rounded-full bg-[#F3F5F7] hover:bg-[#E2E4E7] flex items-center justify-center text-[#181A1C] cursor-pointer"
                    >
                      <SlidersHorizontal size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {modalOpen && (
        <HoldingModal
          editingHolding={editingHolding}
          buyTargetHolding={buyTargetHolding}
          investmentAccounts={investmentAccounts}
          cashAccounts={cashAccounts}
          onClose={() => {
            setModalOpen(false);
            setEditingHolding(null);
            setBuyTargetHolding(null);
          }}
          onBuyOrAdd={(params) => {
            onBuyOrAddHolding(params);
            setModalOpen(false);
            setBuyTargetHolding(null);
          }}
          onUpdate={(updated) => {
            onUpdateHolding(updated);
            setModalOpen(false);
            setEditingHolding(null);
          }}
          onDelete={(id) => {
            onDeleteHolding(id);
            setModalOpen(false);
            setEditingHolding(null);
          }}
        />
      )}
    </div>
  );
}

interface HoldingModalProps {
  editingHolding: InvestmentHolding | null;
  buyTargetHolding: InvestmentHolding | null;
  investmentAccounts: Account[];
  cashAccounts: Account[];
  onClose: () => void;
  onBuyOrAdd: (params: {
    holdingId?: string;
    ticker: string;
    name: string;
    assetClass: InvestmentAssetClass;
    shares: number;
    price: number;
    fundingAccountId?: string;
    investmentAccountId: string;
  }) => void;
  onUpdate: (holding: InvestmentHolding) => void;
  onDelete: (id: string) => void;
}

function HoldingModal({
  editingHolding,
  buyTargetHolding,
  investmentAccounts,
  cashAccounts,
  onClose,
  onBuyOrAdd,
  onUpdate,
  onDelete,
}: HoldingModalProps) {
  const active = editingHolding || buyTargetHolding;
  const isEditMode = Boolean(editingHolding);

  const [ticker, setTicker] = useState(active?.ticker || '');
  const [name, setName] = useState(active?.name || '');
  const [assetClass, setAssetClass] = useState<InvestmentAssetClass>(
    active?.assetClass || 'US Equities'
  );
  const [shares, setShares] = useState(
    isEditMode && editingHolding ? String(editingHolding.shares) : '5'
  );
  const [price, setPrice] = useState(
    active ? String(active.currentPrice) : '100'
  );
  const [avgCost, setAvgCost] = useState(
    editingHolding ? String(editingHolding.avgCost) : '100'
  );
  const [fundingAccountId, setFundingAccountId] = useState(
    cashAccounts[0]?.id || ''
  );
  const [deductCash, setDeductCash] = useState(!isEditMode);
  const [investmentAccountId, setInvestmentAccountId] = useState(
    active?.accountId || investmentAccounts[0]?.id || 'acc-invest'
  );
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedShares = Number(shares);
    const parsedPrice = Number(price);
    if (!ticker.trim() || !name.trim()) {
      setError('Enter both ticker symbol and asset name.');
      return;
    }
    if (!Number.isFinite(parsedShares) || parsedShares <= 0) {
      setError('Shares must be greater than 0.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Price per share must be greater than $0.');
      return;
    }

    if (isEditMode && editingHolding) {
      onUpdate({
        ...editingHolding,
        ticker: ticker.trim().toUpperCase(),
        name: name.trim(),
        assetClass,
        shares: parsedShares,
        currentPrice: parsedPrice,
        avgCost: Math.max(0.01, Number(avgCost) || parsedPrice),
        accountId: investmentAccountId,
      });
      return;
    }

    onBuyOrAdd({
      holdingId: buyTargetHolding?.id,
      ticker: ticker.trim().toUpperCase(),
      name: name.trim(),
      assetClass,
      shares: parsedShares,
      price: parsedPrice,
      fundingAccountId: deductCash ? fundingAccountId : undefined,
      investmentAccountId,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#181A1C]/40 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg bg-[#FFFFFF] rounded-t-[28px] sm:rounded-[28px] breeze-overlay p-6 sm:p-7 max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-[#E2E4E7] rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-[20px] font-bold text-[#181A1C]">
              {isEditMode
                ? `Edit ${editingHolding?.ticker}`
                : buyTargetHolding
                ? `Buy ${buyTargetHolding.ticker}`
                : 'Add Investment Position'}
            </h2>
            <p className="mt-0.5 text-[14px] text-[#66686D]">
              Updates portfolio holdings and your connected investment balance
            </p>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#F3F5F7] hover:bg-[#E2E4E7] flex items-center justify-center text-[#181A1C] shrink-0 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                Ticker Symbol
              </label>
              <input
                type="text"
                value={ticker}
                disabled={Boolean(buyTargetHolding)}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="e.g. VOO"
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] text-[15px] font-mono font-bold text-[#181A1C] outline-none"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                Asset Class
              </label>
              <select
                value={assetClass}
                disabled={Boolean(buyTargetHolding)}
                onChange={(e) =>
                  setAssetClass(e.target.value as InvestmentAssetClass)
                }
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] text-[15px] text-[#181A1C] outline-none"
              >
                <option value="US Equities">US Equities</option>
                <option value="International">International</option>
                <option value="Fixed Income">Fixed Income</option>
                <option value="Individual Stock">Individual Stock</option>
                <option value="Cash & Treasury">Cash & Treasury</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
              Fund / Asset Name
            </label>
            <input
              type="text"
              value={name}
              disabled={Boolean(buyTargetHolding)}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vanguard S&P 500 ETF"
              className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] text-[15px] text-[#181A1C] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                {isEditMode ? 'Total Shares' : 'Shares to Buy'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] text-[15px] font-semibold text-[#181A1C] tabular-nums outline-none"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                Price per Share (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] text-[15px] font-semibold text-[#181A1C] tabular-nums outline-none"
              />
            </div>
          </div>

          {isEditMode && (
            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                Average Cost Basis (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] text-[15px] font-semibold text-[#181A1C] tabular-nums outline-none"
              />
            </div>
          )}

          {!isEditMode && cashAccounts.length > 0 && (
            <div className="rounded-[18px] bg-[#F3F5F7] p-4 space-y-3">
              <label className="flex items-center gap-2.5 text-[14px] font-semibold text-[#181A1C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={deductCash}
                  onChange={(e) => setDeductCash(e.target.checked)}
                  className="w-5 h-5 accent-[#00A24E] rounded"
                />
                <span>Fund purchase from a cash account</span>
              </label>

              {deductCash && (
                <select
                  value={fundingAccountId}
                  onChange={(e) => setFundingAccountId(e.target.value)}
                  className="w-full h-[46px] px-3.5 rounded-[14px] bg-[#FFFFFF] border border-[#E2E4E7] text-[14px] text-[#181A1C] outline-none"
                >
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.balance)})
                    </option>
                  ))}
                </select>
              )}

              <p className="text-[12px] text-[#66686D] tabular-nums">
                Order total:{' '}
                <strong className="text-[#181A1C]">
                  {formatCurrency(
                    (Number(shares) || 0) * (Number(price) || 0)
                  )}
                </strong>
              </p>
            </div>
          )}

          {investmentAccounts.length > 0 && (
            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                Brokerage Account
              </label>
              <select
                value={investmentAccountId}
                onChange={(e) => setInvestmentAccountId(e.target.value)}
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] text-[15px] text-[#181A1C] outline-none"
              >
                {investmentAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (••{a.lastFour})
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-[13px] font-semibold text-[#D32F34]">{error}</p>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            {isEditMode && editingHolding ? (
              <button
                type="button"
                onClick={() => onDelete(editingHolding.id)}
                className="h-12 px-4 rounded-full bg-[#F3F5F7] hover:bg-[#ffdad6] text-[#D32F34] text-[14px] font-semibold cursor-pointer"
              >
                Sell / Remove
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-12 px-5 rounded-full bg-[#F3F5F7] hover:bg-[#E2E4E7] text-[#181A1C] text-[14px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-12 px-6 rounded-full bg-[#00A24E] hover:bg-[#159A49] text-[#FFFFFF] text-[14px] font-semibold cursor-pointer"
              >
                {isEditMode ? 'Save Position' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
