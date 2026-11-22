import {
  ArrowLeftRight,
  ArrowDownLeft,
  Coffee,
  CreditCard,
  HeartPulse,
  Home,
  Landmark,
  PiggyBank,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Train,
  TrendingUp,
} from 'lucide-react';
import { AccountType, SpendCategory } from '../types/breeze';

export function CategoryIcon({
  category,
  size = 20,
}: {
  category: SpendCategory;
  size?: number;
}) {
  switch (category) {
    case 'Groceries':
      return <ShoppingCart size={size} className="text-[#00A24E]" />;
    case 'Dining Out':
      return <Coffee size={size} className="text-[#C97D00]" />;
    case 'Transit & Travel':
      return <Train size={size} className="text-[#5A52AF]" />;
    case 'Home & Utilities':
      return <Home size={size} className="text-[#00A24E]" />;
    case 'Wellness':
      return <HeartPulse size={size} className="text-[#5A52AF]" />;
    case 'Shopping':
      return <ShoppingBag size={size} className="text-[#C97D00]" />;
    case 'Subscriptions':
      return <Repeat size={size} className="text-[#5A52AF]" />;
    case 'Income':
      return <ArrowDownLeft size={size} className="text-[#00A24E]" />;
    case 'Transfer':
      return <ArrowLeftRight size={size} className="text-[#181A1C]" />;
    default:
      return <ShoppingBag size={size} className="text-[#66686D]" />;
  }
}

export function getCategoryIconBg(category: SpendCategory): string {
  switch (category) {
    case 'Income':
    case 'Groceries':
    case 'Home & Utilities':
      return 'bg-[#DBFCE1]/70';
    case 'Dining Out':
    case 'Shopping':
      return 'bg-[#FDF3E7]';
    case 'Transit & Travel':
    case 'Wellness':
    case 'Subscriptions':
      return 'bg-[#EFEFFE]';
    default:
      return 'bg-[#F3F5F7]';
  }
}

export function AccountIcon({
  type,
  size = 20,
}: {
  type: AccountType;
  size?: number;
}) {
  switch (type) {
    case 'checking':
      return <Landmark size={size} className="text-[#00A24E]" />;
    case 'savings':
      return <PiggyBank size={size} className="text-[#00A24E]" />;
    case 'investment':
      return <TrendingUp size={size} className="text-[#5A52AF]" />;
    case 'credit':
      return <CreditCard size={size} className="text-[#C97D00]" />;
    case 'loan':
      return <Landmark size={size} className="text-[#D32F34]" />;
  }
}
