export type ScreenTab =
  | 'overview'
  | 'activity'
  | 'ai-chat'
  | 'plan'
  | 'advice'
  | 'accounts'
  | 'investments';

export type PlanSubTab = 'budgets' | 'goals';

export type InvestmentAssetClass =
  | 'US Equities'
  | 'International'
  | 'Fixed Income'
  | 'Individual Stock'
  | 'Cash & Treasury';

export interface InvestmentHolding {
  id: string;
  ticker: string;
  name: string;
  assetClass: InvestmentAssetClass;
  shares: number;
  avgCost: number;
  currentPrice: number;
  dayChangePct: number;
  dividendYieldPct: number;
  accountId: string;
}

export type AccountType = 'checking' | 'savings' | 'investment' | 'credit' | 'loan';

export interface Account {
  id: string;
  name: string;
  institution: string;
  lastFour: string;
  type: AccountType;
  balance: number; // Positive for assets, negative for credit/liabilities
  apyOrApr?: string;
  creditLimit?: number; // For credit accounts
  isPrimary?: boolean;
  includeInNetWorth?: boolean;
  notes?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionStatus = 'completed' | 'pending';

export type SpendCategory =
  | 'Groceries'
  | 'Dining Out'
  | 'Transit & Travel'
  | 'Home & Utilities'
  | 'Wellness'
  | 'Shopping'
  | 'Subscriptions'
  | 'Income'
  | 'Transfer';

export interface Transaction {
  id: string;
  merchant: string;
  category: SpendCategory;
  type: TransactionType;
  amount: number; // Always positive magnitude; direction determined by type
  date: string; // YYYY-MM-DD
  timeLabel: string; // e.g. "9:42 AM"
  accountId: string;
  toAccountId?: string; // Used when type === 'transfer'
  status: TransactionStatus;
  notes?: string;
}

export interface CategoryBudget {
  id: string;
  category: Exclude<SpendCategory, 'Income' | 'Transfer'>;
  limit: number;
  accent: 'primary' | 'secondary' | 'tertiary';
}

export interface RecurringBill {
  id: string;
  name: string;
  provider: string;
  category: Exclude<SpendCategory, 'Income' | 'Transfer'>;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  cadence: 'Monthly' | 'Annual';
  autoPay: boolean;
  accountId: string;
  paidThisCycle: boolean;
}

export interface SavingsGoal {
  id: string;
  title: string;
  subtitle: string;
  savedAmount: number;
  targetAmount: number;
  monthlyTarget: number;
  targetDate: string; // e.g. "Oct 2027"
  imageUrl: string;
}

export type TimeframeOption = '1M' | '3M' | '6M' | '1Y';

export interface NetWorthPoint {
  label: string;
  dateLabel: string;
  value: number;
  cash: number;
  investments: number;
}

export interface ExtractedTransactionDraft {
  id: string;
  merchant: string;
  amount: number;
  type: TransactionType;
  category: SpendCategory;
  date: string;
  accountId: string;
  notes?: string;
  saved?: boolean;
}

export interface ChatAttachment {
  fileName: string;
  mimeType: string;
  data: string; // base64 without data: prefix
  previewUrl?: string;
}

export interface AdvisorChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachmentName?: string;
  attachmentPreviewUrl?: string;
  extractedTransactions?: ExtractedTransactionDraft[];
  suggestedFollowUps?: string[];
  isError?: boolean;
}

export interface AdvisorInsight {
  id: string;
  title: string;
  summary: string;
  impactLabel: string;
  category: 'cashflow' | 'budget' | 'savings' | 'accounts' | string;
  priority: 'positive' | 'attention' | 'opportunity' | string;
  suggestedQuestion: string;
}

export interface BreezeState {
  accounts: Account[];
  transactions: Transaction[];
  budgets: CategoryBudget[];
  bills: RecurringBill[];
  goals: SavingsGoal[];
  holdings: InvestmentHolding[];
}
