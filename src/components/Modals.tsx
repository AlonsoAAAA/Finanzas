import { Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GOAL_IMAGE_PRESETS } from '../data/seedData';
import {
  Account,
  CategoryBudget,
  SavingsGoal,
  SpendCategory,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../types/breeze';
import { formatCurrency } from '../utils/formatters';

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalShell({ title, subtitle, onClose, children }: ModalShellProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        {/* Mobile grab handle */}
        <div className="w-10 h-1.5 bg-[#E2E4E7] rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-[20px] font-bold leading-[26px] tracking-[-0.015em] text-[#181A1C]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[14px] text-[#66686D]">{subtitle}</p>
            )}
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

        {children}
      </div>
    </div>
  );
}

/* 1. Add / Edit Transaction Modal */
interface TransactionModalProps {
  accounts: Account[];
  initialTx: Transaction | null;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id'>, existingId?: string) => void;
  onDelete?: (txId: string) => void;
}

const EXPENSE_CATEGORIES: SpendCategory[] = [
  'Groceries',
  'Dining Out',
  'Home & Utilities',
  'Transit & Travel',
  'Wellness',
  'Shopping',
  'Subscriptions',
];

export function TransactionModal({
  accounts,
  initialTx,
  onClose,
  onSave,
  onDelete,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>(
    initialTx?.type || 'expense'
  );
  const [merchant, setMerchant] = useState(initialTx?.merchant || '');
  const [amount, setAmount] = useState(
    initialTx ? String(initialTx.amount) : ''
  );
  const [category, setCategory] = useState<SpendCategory>(
    initialTx?.category || 'Groceries'
  );
  const [accountId, setAccountId] = useState(
    initialTx?.accountId || accounts[0]?.id || ''
  );
  const [toAccountId, setToAccountId] = useState(
    initialTx?.toAccountId || accounts[1]?.id || accounts[0]?.id || ''
  );
  const [date, setDate] = useState(initialTx?.date || '2026-11-21');
  const [status, setStatus] = useState<TransactionStatus>(
    initialTx?.status || 'completed'
  );
  const [notes, setNotes] = useState(initialTx?.notes || '');
  const [error, setError] = useState('');

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    if (nextType === 'income') setCategory('Income');
    else if (nextType === 'transfer') setCategory('Transfer');
    else if (category === 'Income' || category === 'Transfer')
      setCategory('Groceries');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!merchant.trim()) {
      setError('Enter a merchant or description.');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter an amount greater than $0.00.');
      return;
    }
    if (type === 'transfer' && accountId === toAccountId) {
      setError('Select two different accounts for a transfer.');
      return;
    }

    onSave(
      {
        merchant: merchant.trim(),
        amount: Math.round(parsed * 100) / 100,
        type,
        category:
          type === 'income'
            ? 'Income'
            : type === 'transfer'
            ? 'Transfer'
            : category,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        date,
        timeLabel: initialTx?.timeLabel || 'Just now',
        status,
        notes: notes.trim() || undefined,
      },
      initialTx?.id
    );
  };

  return (
    <ModalShell
      title={initialTx ? 'Edit Transaction' : 'New Transaction'}
      subtitle={
        initialTx
          ? 'Updates adjust your balances and budgets automatically'
          : 'Log income, spending, or an account transfer'
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-1 p-1.5 rounded-full bg-[#F3F5F7]">
          {(['expense', 'income', 'transfer'] as const).map((t) => {
            const active = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`flex-1 min-h-[40px] rounded-full text-[13px] font-semibold capitalize transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#FFFFFF] text-[#181A1C] shadow-xs'
                    : 'text-[#66686D] hover:text-[#181A1C]'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
              Merchant / Title
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Whole Foods Market"
              className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
              Amount (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] font-semibold text-[#181A1C] tabular-nums outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {type === 'expense' && (
            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SpendCategory)}
                className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] outline-none"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
              {type === 'transfer' ? 'From Account' : 'Account'}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] outline-none"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (••{a.lastFour})
                </option>
              ))}
            </select>
          </div>

          {type === 'transfer' && (
            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                To Account
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] outline-none"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (••{a.lastFour})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] tabular-nums outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TransactionStatus)}
              className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] outline-none"
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add context for your records..."
            className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] outline-none"
          />
        </div>

        {error && (
          <p className="text-[13px] font-semibold text-[#D32F34]">{error}</p>
        )}

        <div className="pt-2 flex items-center justify-between gap-3">
          {initialTx && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(initialTx.id)}
              className="h-12 px-4 rounded-full bg-[#F3F5F7] hover:bg-[#ffdad6] text-[#D32F34] text-[14px] font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
              <span>Delete</span>
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
              {initialTx ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

/* 2. Quick Transfer Modal */
interface TransferModalProps {
  accounts: Account[];
  onClose: () => void;
  onTransfer: (fromId: string, toId: string, amount: number, note: string) => void;
}

export function TransferModal({
  accounts,
  onClose,
  onTransfer,
}: TransferModalProps) {
  const [fromId, setFromId] = useState(accounts[0]?.id || '');
  const [toId, setToId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [amount, setAmount] = useState('500');
  const [note, setNote] = useState('Reserve transfer');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount greater than $0.');
      return;
    }
    if (fromId === toId) {
      setError('Choose two different accounts.');
      return;
    }
    onTransfer(fromId, toId, Math.round(parsed * 100) / 100, note.trim());
  };

  return (
    <ModalShell
      title="Move Funds"
      subtitle="Instant transfer between your connected Breeze accounts"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
            From Account
          </label>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] text-[15px] text-[#181A1C] outline-none"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({formatCurrency(a.balance)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
            To Account
          </label>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] text-[15px] text-[#181A1C] outline-none"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({formatCurrency(a.balance)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
            Amount (USD)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[16px] font-semibold text-[#181A1C] tabular-nums outline-none"
          />
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
            Memo
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] outline-none"
          />
        </div>

        {error && (
          <p className="text-[13px] font-semibold text-[#D32F34]">{error}</p>
        )}

        <div className="pt-2 flex justify-end gap-2.5">
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
            Transfer Funds
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* 3. Contribute to Goal Modal */
interface ContributeGoalModalProps {
  goal: SavingsGoal;
  accounts: Account[];
  onClose: () => void;
  onContribute: (goalId: string, accountId: string, amount: number) => void;
}

export function ContributeGoalModal({
  goal,
  accounts,
  onClose,
  onContribute,
}: ContributeGoalModalProps) {
  const cashAccounts = accounts.filter(
    (a) => a.type === 'checking' || a.type === 'savings'
  );
  const [accountId, setAccountId] = useState(cashAccounts[0]?.id || '');
  const [amount, setAmount] = useState(String(goal.monthlyTarget));
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a contribution amount greater than $0.');
      return;
    }
    onContribute(goal.id, accountId, Math.round(parsed * 100) / 100);
  };

  return (
    <ModalShell
      title={`Contribute to ${goal.title}`}
      subtitle={`${formatCurrency(goal.savedAmount, false)} of ${formatCurrency(
        goal.targetAmount,
        false
      )} saved`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[100, 250, goal.monthlyTarget, 1000]
            .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
            .map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className={`min-h-[38px] px-4 rounded-full text-[13px] font-semibold border cursor-pointer ${
                  Number(amount) === preset
                    ? 'bg-[#181A1C] text-[#FFFFFF] border-[#181A1C]'
                    : 'bg-[#FFFFFF] text-[#181A1C] border-[#E2E4E7] hover:bg-[#F3F5F7]'
                }`}
              >
                +{formatCurrency(preset, false)}
              </button>
            ))}
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
            Contribution Amount (USD)
          </label>
          <input
            type="number"
            step="1"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[16px] font-semibold text-[#181A1C] tabular-nums outline-none"
          />
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
            Source Account
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] text-[15px] text-[#181A1C] outline-none"
          >
            {cashAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({formatCurrency(a.balance)})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-[13px] font-semibold text-[#D32F34]">{error}</p>
        )}

        <div className="pt-2 flex justify-end gap-2.5">
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
            Add Contribution
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* 4. Create Goal Modal */
interface CreateGoalModalProps {
  onClose: () => void;
  onCreate: (goal: Omit<SavingsGoal, 'id'>) => void;
}

export function CreateGoalModal({ onClose, onCreate }: CreateGoalModalProps) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('5000');
  const [savedAmount, setSavedAmount] = useState('500');
  const [monthlyTarget, setMonthlyTarget] = useState('300');
  const [targetDate, setTargetDate] = useState('Dec 2027');
  const [imageUrl, setImageUrl] = useState(GOAL_IMAGE_PRESETS[0].url);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(targetAmount);
    const saved = Number(savedAmount);
    const monthly = Number(monthlyTarget);
    if (!title.trim()) {
      setError('Give your savings goal a name.');
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      setError('Target amount must be greater than $0.');
      return;
    }
    onCreate({
      title: title.trim(),
      subtitle: subtitle.trim() || 'Dedicated lifestyle savings fund',
      targetAmount: Math.round(target),
      savedAmount: Math.max(0, Math.round(saved || 0)),
      monthlyTarget: Math.max(25, Math.round(monthly || 100)),
      targetDate: targetDate.trim() || 'Dec 2027',
      imageUrl,
    });
  };

  return (
    <ModalShell
      title="Create Lifestyle Goal"
      subtitle="Set a milestone and track steady progress"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
            Goal Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Mediterranean Sabbatical"
            className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] outline-none"
          />
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
            Subtitle
          </label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="e.g. Flights, coastal villa & dining"
            className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[15px] text-[#181A1C] outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
              Target Amount
            </label>
            <input
              type="number"
              min="50"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] text-[15px] font-semibold text-[#181A1C] tabular-nums outline-none"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
              Initial Deposit
            </label>
            <input
              type="number"
              min="0"
              value={savedAmount}
              onChange={(e) => setSavedAmount(e.target.value)}
              className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] text-[15px] font-semibold text-[#181A1C] tabular-nums outline-none"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
              Monthly Pace
            </label>
            <input
              type="number"
              min="10"
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(e.target.value)}
              className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] text-[15px] font-semibold text-[#181A1C] tabular-nums outline-none"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
              Target Date
            </label>
            <input
              type="text"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              placeholder="Dec 2027"
              className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] text-[15px] text-[#181A1C] outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#66686D] mb-2">
            Cover Scene
          </label>
          <div className="grid grid-cols-4 gap-2">
            {GOAL_IMAGE_PRESETS.map((preset) => {
              const selected = imageUrl === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setImageUrl(preset.url)}
                  className={`relative h-16 rounded-[12px] overflow-hidden border-2 transition-all cursor-pointer ${
                    selected
                      ? 'border-[#00A24E] ring-2 ring-[#DBFCE1]'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="text-[13px] font-semibold text-[#D32F34]">{error}</p>
        )}

        <div className="pt-2 flex justify-end gap-2.5">
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
            Create Goal
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* 5. Edit / Add Budget Modal */
interface BudgetModalProps {
  initialBudget: CategoryBudget | null;
  existingCategories: string[];
  onClose: () => void;
  onSave: (
    category: Exclude<SpendCategory, 'Income' | 'Transfer'>,
    limit: number,
    existingId?: string
  ) => void;
}

const BUDGETABLE_CATEGORIES: Exclude<SpendCategory, 'Income' | 'Transfer'>[] = [
  'Groceries',
  'Dining Out',
  'Home & Utilities',
  'Transit & Travel',
  'Wellness',
  'Shopping',
  'Subscriptions',
];

export function BudgetModal({
  initialBudget,
  existingCategories,
  onClose,
  onSave,
}: BudgetModalProps) {
  const availableCategories = initialBudget
    ? [initialBudget.category]
    : BUDGETABLE_CATEGORIES.filter((c) => !existingCategories.includes(c));

  const [category, setCategory] = useState<
    Exclude<SpendCategory, 'Income' | 'Transfer'>
  >(initialBudget?.category || availableCategories[0] || 'Groceries');
  const [limit, setLimit] = useState(
    initialBudget ? String(initialBudget.limit) : '400'
  );
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Monthly limit must be greater than $0.');
      return;
    }
    onSave(category, Math.round(parsed), initialBudget?.id);
  };

  return (
    <ModalShell
      title={
        initialBudget
          ? `Adjust ${initialBudget.category} Limit`
          : 'New Category Budget'
      }
      subtitle="Set a calm monthly target for this spending category"
      onClose={onClose}
    >
      {availableCategories.length === 0 ? (
        <div className="space-y-4">
          <p className="text-[14px] text-[#66686D]">
            All spending categories already have monthly limits configured. Click
            any category tile to adjust its cap.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-full bg-[#181A1C] text-[#FFFFFF] text-[14px] font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!initialBudget && (
            <div>
              <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as Exclude<
                      SpendCategory,
                      'Income' | 'Transfer'
                    >
                  )
                }
                className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] text-[15px] text-[#181A1C] outline-none"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-[#66686D] mb-1.5">
              Monthly Cap (USD)
            </label>
            <input
              type="number"
              min="10"
              step="10"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full h-[52px] px-4 rounded-[18px] bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[16px] font-semibold text-[#181A1C] tabular-nums outline-none"
            />
          </div>

          {error && (
            <p className="text-[13px] font-semibold text-[#D32F34]">{error}</p>
          )}

          <div className="pt-2 flex justify-end gap-2.5">
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
              Save Limit
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
