import { Account, Transaction } from '../types/breeze';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { CategoryIcon, getCategoryIconBg } from './CategoryIcon';

interface TransactionRowProps {
  transaction: Transaction;
  accounts: Account[];
  onSelect: (tx: Transaction) => void;
  showDate?: boolean;
}

export function TransactionRow({
  transaction,
  accounts,
  onSelect,
  showDate = false,
}: TransactionRowProps) {
  const account = accounts.find((a) => a.id === transaction.accountId);
  const toAccount = transaction.toAccountId
    ? accounts.find((a) => a.id === transaction.toAccountId)
    : undefined;

  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';

  const amountDisplay = isIncome
    ? `+${formatCurrency(transaction.amount)}`
    : isTransfer
    ? formatCurrency(transaction.amount)
    : `-${formatCurrency(transaction.amount)}`;

  const amountColor = isIncome
    ? 'text-[#00A24E]'
    : isTransfer
    ? 'text-[#66686D]'
    : 'text-[#181A1C]';

  const subtitleParts: string[] = [
    showDate
      ? `${formatShortDate(transaction.date)}, ${transaction.timeLabel}`
      : transaction.timeLabel,
    transaction.category,
  ];

  if (isTransfer && toAccount && account) {
    subtitleParts.push(`${account.name} to ${toAccount.name}`);
  } else if (account) {
    subtitleParts.push(`${account.name} ••${account.lastFour}`);
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(transaction)}
      className="w-full min-h-[64px] px-3 py-2.5 rounded-[16px] flex items-center justify-between gap-3 text-left transition-colors duration-150 hover:bg-[#F3F5F7] focus-visible:bg-[#F3F5F7] cursor-pointer group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-[1.03] ${getCategoryIconBg(
            transaction.category
          )}`}
        >
          <CategoryIcon category={transaction.category} size={20} />
        </div>

        <div className="min-w-0">
          <div className="text-[16px] font-semibold leading-[22px] text-[#181A1C] truncate">
            {transaction.merchant}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[13px] sm:text-[14px] leading-[20px] text-[#66686D] truncate">
            <span className="truncate">{subtitleParts.join(' · ')}</span>
            {transaction.status === 'pending' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#C97D00]">Pending</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div
          className={`text-[16px] font-semibold leading-[22px] tabular-nums ${amountColor}`}
        >
          {amountDisplay}
        </div>
      </div>
    </button>
  );
}
