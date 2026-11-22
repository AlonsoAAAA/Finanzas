import { BreezeState } from '../types/breeze';
import { INITIAL_BREEZE_STATE } from '../data/seedData';

const STORAGE_KEY = 'breeze_wealth_state_v1';

export function formatCurrency(amount: number, showDecimals = true): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(abs);
  return amount < 0 ? `-${formatted}` : formatted;
}

export function formatSignedCurrency(amount: number, showDecimals = true): string {
  if (amount > 0) return `+${formatCurrency(amount, showDecimals)}`;
  if (amount < 0) return formatCurrency(amount, showDecimals);
  return formatCurrency(0, showDecimals);
}

export function formatDateGroupLabel(isoDate: string): string {
  if (isoDate === '2026-11-21') return 'Today';
  if (isoDate === '2026-11-20') return 'Yesterday';
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: year !== 2026 ? 'numeric' : undefined,
  });
}

export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function addOneMonth(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const next = new Date(year, month, day);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadBreezeState(): BreezeState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_BREEZE_STATE;
    const parsed = JSON.parse(raw) as Partial<BreezeState>;
    if (
      !Array.isArray(parsed.accounts) ||
      !Array.isArray(parsed.transactions) ||
      !Array.isArray(parsed.budgets) ||
      !Array.isArray(parsed.bills) ||
      !Array.isArray(parsed.goals)
    ) {
      return INITIAL_BREEZE_STATE;
    }
    return {
      ...(parsed as BreezeState),
      holdings: Array.isArray(parsed.holdings)
        ? parsed.holdings
        : INITIAL_BREEZE_STATE.holdings,
    };
  } catch {
    return INITIAL_BREEZE_STATE;
  }
}

export function saveBreezeState(state: BreezeState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function clearBreezeStorage(): BreezeState {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  return INITIAL_BREEZE_STATE;
}

export function exportTransactionsCsv(
  transactions: BreezeState['transactions'],
  accounts: BreezeState['accounts']
): void {
  const accountLookup = new Map(accounts.map((a) => [a.id, `${a.name} (••${a.lastFour})`]));
  const headers = ['Date', 'Time', 'Merchant', 'Category', 'Type', 'Amount', 'Account', 'Status', 'Notes'];
  const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;

  const rows = transactions.map((tx) => [
    tx.date,
    tx.timeLabel,
    tx.merchant,
    tx.category,
    tx.type,
    tx.type === 'expense' ? `-${tx.amount.toFixed(2)}` : tx.amount.toFixed(2),
    accountLookup.get(tx.accountId) || tx.accountId,
    tx.status,
    tx.notes || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCell(String(cell))).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `breeze-activity-2026-11.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
