import {
  AdvisorChatMessage,
  BreezeState,
  ExtractedTransactionDraft,
} from '../types/breeze';
import { AiChatPanel } from './AiChatPanel';

interface AiChatScreenProps {
  state: BreezeState;
  messages: AdvisorChatMessage[];
  onMessagesChange: React.Dispatch<
    React.SetStateAction<AdvisorChatMessage[]>
  >;
  onCommitTransactions: (drafts: ExtractedTransactionDraft[]) => void;
  defaultAccountId?: string;
}

export function AiChatScreen({
  state,
  messages,
  onMessagesChange,
  onCommitTransactions,
  defaultAccountId,
}: AiChatScreenProps) {
  return (
    <div className="h-[calc(100vh-160px)] md:h-[calc(100vh-150px)] min-h-[460px] breeze-card rounded-[24px] overflow-hidden">
      <AiChatPanel
        compact
        hideHeader
        state={state}
        messages={messages}
        onMessagesChange={onMessagesChange}
        onCommitTransactions={onCommitTransactions}
        defaultAccountId={defaultAccountId}
      />
    </div>
  );
}
