import { Download, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Account,
  SpendCategory,
  Transaction,
  TransactionType,
} from '../types/breeze';
import {
  exportTransactionsCsv,
  formatCurrency,
  formatDateGroupLabel,
} from '../utils/formatters';
import { TransactionRow } from './TransactionRow';

interface ActivityScreenProps {
  accounts: Account[];
  transactions: Transaction[];
  initialAccountFilter: string;
  onClearInitialAccount: () => void;
  onOpenNewTransaction: () => void;
  onSelectTransaction: (tx: Transaction) => void;
}

const CATEGORIES: ('All' | SpendCategory)[] = [
  'All',
  'Groceries',
  'Dining Out',
  'Home & Utilities',
  'Transit & Travel',
  'Wellness',
  'Shopping',
  'Subscriptions',
  'Income',
  'Transfer',
];

export function ActivityScreen({
  accounts,
  transactions,
  initialAccountFilter,
  onClearInitialAccount,
  onOpenNewTransaction,
  onSelectTransaction,
}: ActivityScreenProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<'All' | SpendCategory>(
    'All'
  );
  const [accountFilter, setAccountFilter] = useState<string>(
    initialAccountFilter || 'all'
  );

  const activeAccountFilter = initialAccountFilter || accountFilter;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...transactions]
      .filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (categoryFilter !== 'All' && tx.category !== categoryFilter)
          return false;
        if (
          activeAccountFilter !== 'all' &&
          tx.accountId !== activeAccountFilter &&
          tx.toAccountId !== activeAccountFilter
        )
          return false;
        if (q) {
          const hay =
            `${tx.merchant} ${tx.category} ${tx.notes || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, search, typeFilter, categoryFilter, activeAccountFilter]);

  const { totalInflow, totalOutflow, netFlow } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const tx of filtered) {
      if (tx.type === 'income') inflow += tx.amount;
      else if (tx.type === 'expense') outflow += tx.amount;
    }
    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      netFlow: inflow - outflow,
    };
  }, [filtered]);

  const groupedByDate = useMemo(() => {
    const groups: { date: string; label: string; items: Transaction[] }[] = [];
    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const existing = map.get(tx.date);
      if (existing) existing.push(tx);
      else map.set(tx.date, [tx]);
    }
    for (const [date, items] of map.entries()) {
      groups.push({ date, label: formatDateGroupLabel(date), items });
    }
    return groups;
  }, [filtered]);

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setCategoryFilter('All');
    setAccountFilter('all');
    onClearInitialAccount();
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Export */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-[36px] tracking-[-0.02em] text-[#181A1C]">
            Activity & Cash Flow
          </h1>
          <p className="mt-1 text-[14px] text-[#66686D]">
            Search, filter, edit, or export your full transaction ledger
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportTransactionsCsv(filtered, accounts)}
            className="h-11 px-5 rounded-full bg-[#FFFFFF] border border-[#E2E4E7] hover:bg-[#F3F5F7] text-[14px] font-semibold text-[#181A1C] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewTransaction}
            className="h-11 px-5 rounded-full bg-[#00A24E] hover:bg-[#159A49] text-[#FFFFFF] text-[14px] font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Cash Flow Summary Strip */}
      <div className="breeze-card rounded-[24px] p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.02em] uppercase text-[#66686D]">
            Total Inflows
          </p>
          <p className="mt-1 text-[26px] font-bold leading-[32px] tracking-[-0.02em] text-[#159A49] tabular-nums">
            +{formatCurrency(totalInflow)}
          </p>
        </div>
        <div className="sm:border-l sm:border-[#E2E4E7] sm:pl-6">
          <p className="text-[12px] font-semibold tracking-[0.02em] uppercase text-[#66686D]">
            Total Outflows
          </p>
          <p className="mt-1 text-[26px] font-bold leading-[32px] tracking-[-0.02em] text-[#181A1C] tabular-nums">
            -{formatCurrency(totalOutflow)}
          </p>
        </div>
        <div className="sm:border-l sm:border-[#E2E4E7] sm:pl-6">
          <p className="text-[12px] font-semibold tracking-[0.02em] uppercase text-[#66686D]">
            Net Cash Flow
          </p>
          <p
            className={`mt-1 text-[26px] font-bold leading-[32px] tracking-[-0.02em] tabular-nums ${
              netFlow >= 0 ? 'text-[#00A24E]' : 'text-[#D32F34]'
            }`}
          >
            {netFlow >= 0 ? '+' : ''}
            {formatCurrency(netFlow)}
          </p>
        </div>
      </div>

      {/* Search, Segmented Controls, and Category Chips */}
      <div className="breeze-card rounded-[24px] p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#66686D] pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchant, category, or note..."
              className="w-full h-[52px] pl-11 pr-10 rounded-full bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] placeholder:text-[#66686D] transition-colors outline-none"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[#66686D] hover:text-[#181A1C] cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="md:col-span-4 flex items-center gap-1 p-1.5 rounded-full bg-[#F3F5F7] overflow-x-auto">
            {(['all', 'income', 'expense', 'transfer'] as const).map((t) => {
              const label =
                t === 'all'
                  ? 'All'
                  : t === 'income'
                  ? 'Income'
                  : t === 'expense'
                  ? 'Expenses'
                  : 'Transfers';
              const active = typeFilter === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`flex-1 min-h-[38px] px-3 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#FFFFFF] text-[#181A1C] shadow-xs'
                      : 'text-[#66686D] hover:text-[#181A1C]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by account"
              value={activeAccountFilter}
              onChange={(e) => {
                onClearInitialAccount();
                setAccountFilter(e.target.value);
              }}
              className="w-full h-[52px] px-4 rounded-full bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[14px] font-semibold text-[#181A1C] outline-none cursor-pointer"
            >
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (••{acc.lastFour})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`min-h-[38px] px-4 rounded-full text-[13px] font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#181A1C] text-[#FFFFFF] border-[#181A1C]'
                    : 'bg-[#FFFFFF] text-[#181A1C] border-[#E2E4E7] hover:bg-[#F3F5F7]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Date-Grouped Transactions */}
        {groupedByDate.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[16px] font-semibold text-[#181A1C]">
              No transactions match your filters
            </p>
            <p className="mt-1 text-[14px] text-[#66686D]">
              Try clearing active filters or log a new entry.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-11 px-5 rounded-full bg-[#F3F5F7] hover:bg-[#e5e8ec] text-[14px] font-semibold text-[#181A1C] cursor-pointer"
              >
                Reset filters
              </button>
              <button
                type="button"
                onClick={onOpenNewTransaction}
                className="h-11 px-5 rounded-full bg-[#00A24E] hover:bg-[#159A49] text-[14px] font-semibold text-[#FFFFFF] cursor-pointer"
              >
                Add transaction
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {groupedByDate.map((group) => (
              <div key={group.date}>
                <h3 className="px-3 mb-1.5 text-[12px] font-semibold tracking-[0.04em] uppercase text-[#66686D]">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.items.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      transaction={tx}
                      accounts={accounts}
                      onSelect={onSelectTransaction}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
