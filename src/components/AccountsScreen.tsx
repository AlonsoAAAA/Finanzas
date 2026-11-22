import {
  ArrowRight,
  FileUp,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Account, AccountType } from '../types/breeze';
import { formatCurrency } from '../utils/formatters';
import { AccountIcon } from './CategoryIcon';

interface AccountsScreenProps {
  accounts: Account[];
  onSaveAccount: (account: Omit<Account, 'id'>, existingId?: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onToggleIncludeNetWorth: (accountId: string) => void;
  onViewAccountLedger: (accountId: string) => void;
  onImportStatementForAccount: (account: Account) => void;
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking Account',
  savings: 'High-Yield Savings',
  investment: 'Investment & Brokerage',
  credit: 'Credit Card',
  loan: 'Loan / Liability',
};

export function AccountsScreen({
  accounts,
  onSaveAccount,
  onDeleteAccount,
  onToggleIncludeNetWorth,
  onViewAccountLedger,
  onImportStatementForAccount,
}: AccountsScreenProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const summary = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let creditUsed = 0;
    let creditLimitTotal = 0;

    for (const acc of accounts) {
      if (acc.includeInNetWorth === false) continue;
      if (acc.balance >= 0) totalAssets += acc.balance;
      else totalLiabilities += Math.abs(acc.balance);

      if (acc.type === 'credit' && acc.creditLimit && acc.creditLimit > 0) {
        creditUsed += Math.abs(Math.min(0, acc.balance));
        creditLimitTotal += acc.creditLimit;
      }
    }

    const utilizationPct =
      creditLimitTotal > 0
        ? Math.round((creditUsed / creditLimitTotal) * 100)
        : 0;

    return {
      netWorth: totalAssets - totalLiabilities,
      totalAssets,
      totalLiabilities,
      utilizationPct,
    };
  }, [accounts]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-[36px] tracking-[-0.02em] text-[#181A1C]">
            Accounts & Configuration
          </h1>
          <p className="mt-1 text-[14px] text-[#66686D]">
            Configure checking, savings, investments, credit limits, and statement imports
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingAccount(null);
            setModalOpen(true);
          }}
          className="h-11 px-5 rounded-full bg-[#00A24E] hover:bg-[#159A49] text-[#FFFFFF] text-[14px] font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Account</span>
        </button>
      </div>

      {/* Summary Strip */}
      <section className="breeze-summary-wash rounded-[24px] p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#66686D]">
            Tracked Net Worth
          </p>
          <p className="mt-1 text-[26px] font-bold text-[#181A1C] tabular-nums">
            {formatCurrency(summary.netWorth)}
          </p>
        </div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#66686D]">
            Total Assets
          </p>
          <p className="mt-1 text-[26px] font-bold text-[#00A24E] tabular-nums">
            {formatCurrency(summary.totalAssets)}
          </p>
        </div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#66686D]">
            Liabilities & Credit
          </p>
          <p className="mt-1 text-[26px] font-bold text-[#181A1C] tabular-nums">
            {formatCurrency(summary.totalLiabilities)}
          </p>
        </div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#66686D]">
            Credit Utilization
          </p>
          <p className="mt-1 text-[26px] font-bold text-[#181A1C] tabular-nums">
            {summary.utilizationPct}%
          </p>
        </div>
      </section>

      {/* Account Configuration Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {accounts.map((acc) => {
          const isLiability = acc.type === 'credit' || acc.type === 'loan';
          const utilized =
            acc.type === 'credit' && acc.creditLimit && acc.creditLimit > 0
              ? Math.min(
                  100,
                  Math.round(
                    (Math.abs(Math.min(0, acc.balance)) / acc.creditLimit) * 100
                  )
                )
              : null;

          return (
            <article
              key={acc.id}
              className="breeze-card rounded-[24px] p-6 flex flex-col justify-between gap-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-[16px] bg-[#F3F5F7] flex items-center justify-center shrink-0">
                      <AccountIcon type={acc.type} size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[17px] font-bold text-[#181A1C] truncate">
                          {acc.name}
                        </h2>
                      </div>
                      <p className="text-[13px] text-[#66686D] truncate">
                        {acc.institution} · ••{acc.lastFour} ·{' '}
                        {ACCOUNT_TYPE_LABELS[acc.type]}
                        {acc.isPrimary ? ' · Primary' : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccount(acc);
                      setModalOpen(true);
                    }}
                    className="min-h-[38px] px-3.5 rounded-full bg-[#F3F5F7] hover:bg-[#E2E4E7] text-[13px] font-semibold text-[#181A1C] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Settings2 size={14} />
                    <span>Configure</span>
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-[12px] font-medium text-[#66686D]">
                      {isLiability ? 'Current Balance Owed' : 'Current Balance'}
                    </p>
                    <p className="text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-[#181A1C] tabular-nums">
                      {formatCurrency(acc.balance)}
                    </p>
                  </div>

                  {acc.apyOrApr && (
                    <span className="text-[13px] font-semibold text-[#006B31] bg-[#DBFCE1] px-3 py-1 rounded-full">
                      {acc.apyOrApr}
                    </span>
                  )}
                </div>

                {utilized !== null && acc.creditLimit && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[12px] text-[#66686D] tabular-nums">
                      <span>Credit utilization ({utilized}%)</span>
                      <span>Limit {formatCurrency(acc.creditLimit, false)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#F3F5F7] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          utilized >= 30 ? 'bg-[#EBA650]' : 'bg-[#00A24E]'
                        }`}
                        style={{ width: `${utilized}%` }}
                      />
                    </div>
                  </div>
                )}

                {acc.notes && (
                  <p className="mt-3 text-[13px] text-[#66686D]">{acc.notes}</p>
                )}
              </div>

              <div className="pt-4 border-t border-[#E2E4E7]/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={acc.includeInNetWorth !== false}
                    aria-label={`Include ${acc.name} in net worth`}
                    onClick={() => onToggleIncludeNetWorth(acc.id)}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                      acc.includeInNetWorth !== false
                        ? 'bg-[#00A24E]'
                        : 'bg-[#E2E4E7]'
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-[#FFFFFF] shadow-xs transition-transform ${
                        acc.includeInNetWorth !== false
                          ? 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-[12px] font-medium text-[#66686D]">
                    Include in Net Worth
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onImportStatementForAccount(acc)}
                    className="min-h-[36px] px-3.5 rounded-full bg-[#DBFCE1]/70 hover:bg-[#DBFCE1] text-[12px] font-semibold text-[#006B31] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <FileUp size={13} />
                    <span>Import Statement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewAccountLedger(acc.id)}
                    className="min-h-[36px] px-3 rounded-full bg-[#F3F5F7] hover:bg-[#E2E4E7] text-[12px] font-semibold text-[#181A1C] inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <span>Ledger</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {modalOpen && (
        <AccountConfigModal
          initialAccount={editingAccount}
          canDelete={accounts.length > 1}
          onClose={() => {
            setModalOpen(false);
            setEditingAccount(null);
          }}
          onSave={(payload, existingId) => {
            onSaveAccount(payload, existingId);
            setModalOpen(false);
            setEditingAccount(null);
          }}
          onDelete={(id) => {
            onDeleteAccount(id);
            setModalOpen(false);
            setEditingAccount(null);
          }}
        />
      )}
    </div>
  );
}

interface AccountConfigModalProps {
  initialAccount: Account | null;
  canDelete: boolean;
  onClose: () => void;
  onSave: (account: Omit<Account, 'id'>, existingId?: string) => void;
  onDelete: (id: string) => void;
}

function AccountConfigModal({
  initialAccount,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: AccountConfigModalProps) {
  const [name, setName] = useState(initialAccount?.name || '');
  const [institution, setInstitution] = useState(
    initialAccount?.institution || ''
  );
  const [type, setType] = useState<AccountType>(
    initialAccount?.type || 'checking'
  );
  const [lastFour, setLastFour] = useState(initialAccount?.lastFour || '');
  const [balance, setBalance] = useState(
    initialAccount ? String(initialAccount.balance) : '0'
  );
  const [apyOrApr, setApyOrApr] = useState(initialAccount?.apyOrApr || '');
  const [creditLimit, setCreditLimit] = useState(
    initialAccount?.creditLimit ? String(initialAccount.creditLimit) : '10000'
  );
  const [isPrimary, setIsPrimary] = useState(Boolean(initialAccount?.isPrimary));
  const [includeInNetWorth, setIncludeInNetWorth] = useState(
    initialAccount?.includeInNetWorth !== false
  );
  const [notes, setNotes] = useState(initialAccount?.notes || '');
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
    if (!name.trim() || !institution.trim()) {
      setError('Account name and institution are required.');
      return;
    }
    const parsedBal = Number(balance);
    if (!Number.isFinite(parsedBal)) {
      setError('Enter a valid numeric balance.');
      return;
    }
    const cleanFour = (lastFour.replace(/\D/g, '') || '0000').slice(-4).padStart(4, '0');
    const parsedLimit =
      type === 'credit' ? Math.max(0, Number(creditLimit) || 0) : undefined;

    onSave(
      {
        name: name.trim(),
        institution: institution.trim(),
        type,
        lastFour: cleanFour,
        balance: Math.round(parsedBal * 100) / 100,
        apyOrApr: apyOrApr.trim() || undefined,
        creditLimit: parsedLimit,
        isPrimary,
        includeInNetWorth,
        notes: notes.trim() || undefined,
      },
      initialAccount?.id
    );
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
              {initialAccount ? `Configure ${initialAccount.name}` : 'Add Account'}
            </h2>
            <p className="mt-0.5 text-[14px] text-[#66686D]">
              Full account parameters, interest rate, and net worth visibility
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
                Account Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Everyday Checking"
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] outline-none"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                Institution
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Chase, Vanguard"
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] outline-none"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                Account Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] text-[15px] text-[#181A1C] outline-none"
              >
                <option value="checking">Checking</option>
                <option value="savings">High-Yield Savings</option>
                <option value="investment">Investment / Brokerage</option>
                <option value="credit">Credit Card</option>
                <option value="loan">Loan / Liability</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                Last 4 Digits
              </label>
              <input
                type="text"
                maxLength={4}
                value={lastFour}
                onChange={(e) => setLastFour(e.target.value)}
                placeholder="4821"
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] text-[15px] text-[#181A1C] tabular-nums outline-none"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                Current Balance (USD)
              </label>
              <input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] font-semibold text-[#181A1C] tabular-nums outline-none"
              />
              <span className="mt-1 block text-[11px] text-[#66686D]">
                Use negative values for credit card or loan debt
              </span>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                APY / APR / Yield Label
              </label>
              <input
                type="text"
                value={apyOrApr}
                onChange={(e) => setApyOrApr(e.target.value)}
                placeholder="e.g. 4.60% APY or 2% Cashback"
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] text-[15px] text-[#181A1C] outline-none"
              />
            </div>
          </div>

          {type === 'credit' && (
            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                Credit Limit (USD)
              </label>
              <input
                type="number"
                min="100"
                step="100"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] text-[15px] font-semibold text-[#181A1C] tabular-nums outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
              Configuration Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Direct deposit account, auto-pay enabled"
              className="w-full h-[50px] px-4 rounded-[16px] bg-[#F3F5F7] text-[15px] text-[#181A1C] outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="inline-flex items-center gap-2.5 text-[14px] font-medium text-[#181A1C] cursor-pointer">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="w-5 h-5 accent-[#00A24E] rounded"
              />
              <span>Primary everyday account</span>
            </label>

            <label className="inline-flex items-center gap-2.5 text-[14px] font-medium text-[#181A1C] cursor-pointer">
              <input
                type="checkbox"
                checked={includeInNetWorth}
                onChange={(e) => setIncludeInNetWorth(e.target.checked)}
                className="w-5 h-5 accent-[#00A24E] rounded"
              />
              <span>Include in Net Worth</span>
            </label>
          </div>

          {error && (
            <p className="text-[13px] font-semibold text-[#D32F34]">{error}</p>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            {initialAccount && canDelete ? (
              <button
                type="button"
                onClick={() => onDelete(initialAccount.id)}
                className="h-12 px-4 rounded-full bg-[#F3F5F7] hover:bg-[#ffdad6] text-[#D32F34] text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <Trash2 size={16} />
                <span>Remove</span>
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
                {initialAccount ? 'Save Configuration' : 'Create Account'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
