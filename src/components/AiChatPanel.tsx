import {
  Check,
  FileText,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { sendAdvisorChat } from '../services/aiService';
import {
  Account,
  AdvisorChatMessage,
  BreezeState,
  ChatAttachment,
  ExtractedTransactionDraft,
  SpendCategory,
} from '../types/breeze';
import { formatCurrency } from '../utils/formatters';

interface AiChatPanelProps {
  state: BreezeState;
  messages: AdvisorChatMessage[];
  onMessagesChange: React.Dispatch<
    React.SetStateAction<AdvisorChatMessage[]>
  >;
  onCommitTransactions: (drafts: ExtractedTransactionDraft[]) => void;
  defaultAccountId?: string;
  pendingPrompt?: string | null;
  onConsumePendingPrompt?: () => void;
  compact?: boolean;
  hideHeader?: boolean;
}

const ALL_CATEGORIES: SpendCategory[] = [
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

const STARTER_PROMPTS = [
  'How can I optimize my November spending?',
  '¿Cómo voy con mis metas y presupuesto?',
  'Coffee $7.25 and groceries $54.10 today',
];

export function AiChatPanel({
  state,
  messages,
  onMessagesChange,
  onCommitTransactions,
  defaultAccountId,
  pendingPrompt,
  onConsumePendingPrompt,
  compact = false,
  hideHeader = false,
}: AiChatPanelProps) {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (pendingPrompt && !sending) {
      const promptText = pendingPrompt;
      onConsumePendingPrompt?.();
      void handleSend(promptText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  const processFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      onMessagesChange((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'File is larger than 10 MB. Please upload a smaller receipt image, PDF, or CSV statement.',
          timestamp: 'Just now',
          isError: true,
        },
      ]);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      const mimeType =
        file.type ||
        (file.name.endsWith('.csv')
          ? 'text/csv'
          : file.name.endsWith('.pdf')
          ? 'application/pdf'
          : 'text/plain');

      setAttachment({
        fileName: file.name,
        mimeType,
        data: base64,
        previewUrl: mimeType.startsWith('image/') ? result : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText ?? input).trim();
    if (!textToSend && !attachment) return;
    if (sending) return;

    const currentAttachment = attachment;
    const userMsg: AdvisorChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text:
        textToSend ||
        `Analyze and categorize expenses from ${currentAttachment?.fileName}`,
      timestamp: 'Just now',
      attachmentName: currentAttachment?.fileName,
      attachmentPreviewUrl: currentAttachment?.previewUrl,
    };

    const nextHistory = [...messages, userMsg];
    onMessagesChange(nextHistory);
    if (!overrideText) setInput('');
    setAttachment(null);
    setSending(true);

    try {
      const contextPrefix = defaultAccountId
        ? `[Target account preference: ${defaultAccountId}] `
        : '';
      const result = await sendAdvisorChat({
        message: contextPrefix + userMsg.text,
        history: nextHistory,
        attachment: currentAttachment,
        state,
      });

      const assistantMsg: AdvisorChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: result.reply,
        timestamp: 'Just now',
        extractedTransactions: result.extractedTransactions.map((tx) => ({
          ...tx,
          accountId: defaultAccountId || tx.accountId,
        })),
        suggestedFollowUps: result.suggestedFollowUps,
      };
      onMessagesChange((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorText =
        err instanceof Error
          ? err.message
          : 'Unable to reach Breeze Advisor right now.';
      onMessagesChange((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: errorText,
          timestamp: 'Just now',
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const updateDraft = (
    messageId: string,
    draftId: string,
    patch: Partial<ExtractedTransactionDraft>
  ) => {
    onMessagesChange((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.extractedTransactions) return m;
        return {
          ...m,
          extractedTransactions: m.extractedTransactions.map((d) =>
            d.id === draftId ? { ...d, ...patch } : d
          ),
        };
      })
    );
  };

  const commitDraftsForMessage = (
    messageId: string,
    drafts: ExtractedTransactionDraft[]
  ) => {
    const unsaved = drafts.filter((d) => !d.saved);
    if (unsaved.length === 0) return;
    onCommitTransactions(unsaved);
    const savedIds = new Set(unsaved.map((d) => d.id));
    onMessagesChange((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.extractedTransactions) return m;
        return {
          ...m,
          extractedTransactions: m.extractedTransactions.map((d) =>
            savedIds.has(d.id) ? { ...d, saved: true } : d
          ),
        };
      })
    );
  };

  return (
    <div
      className={`flex flex-col bg-[#FFFFFF] ${
        compact ? 'h-full' : 'breeze-card rounded-[24px] h-[660px]'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
      }}
    >
      {/* Header */}
      {!compact && !hideHeader && (
        <div className="px-6 py-4 border-b border-[#E2E4E7] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#DBFCE1] flex items-center justify-center">
              <Sparkles size={18} className="text-[#00A24E]" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#181A1C]">
                Breeze AI Advisor & Receipt Scanner
              </h2>
              <p className="text-[12px] text-[#66686D]">
                Drop receipts, tickets, or bank statements · Ask anything in EN or ES
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message Stream */}
      <div
        className={`flex-1 overflow-y-auto p-5 space-y-4 ${
          isDragging ? 'bg-[#DBFCE1]/30' : ''
        }`}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const unsavedCount =
            msg.extractedTransactions?.filter((d) => !d.saved).length || 0;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                isUser ? 'items-end' : 'items-start'
              } gap-2`}
            >
              <div
                className={`max-w-[90%] rounded-[20px] px-4 py-3 text-[14px] leading-[21px] ${
                  isUser
                    ? 'bg-[#181A1C] text-[#FFFFFF]'
                    : msg.isError
                    ? 'bg-[#ffdad6] text-[#93000a]'
                    : 'bg-[#F3F5F7] text-[#181A1C]'
                }`}
              >
                {msg.attachmentPreviewUrl && (
                  <img
                    src={msg.attachmentPreviewUrl}
                    alt={msg.attachmentName || 'Uploaded receipt'}
                    className="mb-2.5 max-h-44 rounded-[12px] object-cover border border-[#FFFFFF]/20"
                  />
                )}
                {!msg.attachmentPreviewUrl && msg.attachmentName && (
                  <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#FFFFFF]/15 text-[12px] font-medium">
                    <FileText size={14} />
                    <span>{msg.attachmentName}</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Extracted Transactions Review Box */}
              {msg.extractedTransactions &&
                msg.extractedTransactions.length > 0 && (
                  <div className="w-full max-w-[96%] rounded-[20px] border border-[#E2E4E7] bg-[#FFFFFF] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#66686D]">
                        Extracted Entries ({msg.extractedTransactions.length})
                      </span>
                      {unsavedCount > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            commitDraftsForMessage(
                              msg.id,
                              msg.extractedTransactions || []
                            )
                          }
                          className="min-h-[32px] px-3.5 rounded-full bg-[#00A24E] hover:bg-[#159A49] text-[#FFFFFF] text-[12px] font-semibold cursor-pointer"
                        >
                          Add All ({unsavedCount})
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {msg.extractedTransactions.map((draft) => (
                        <div
                          key={draft.id}
                          className="rounded-[14px] bg-[#F3F5F7] p-3 flex flex-wrap items-center justify-between gap-2.5"
                        >
                          <div className="min-w-[140px] flex-1">
                            <p className="text-[14px] font-semibold text-[#181A1C] truncate">
                              {draft.merchant}
                            </p>
                            <p className="text-[12px] text-[#66686D] tabular-nums">
                              {draft.date} ·{' '}
                              {draft.type === 'income' ? '+' : '-'}
                              {formatCurrency(draft.amount)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <select
                              aria-label="Category"
                              disabled={draft.saved}
                              value={draft.category}
                              onChange={(e) =>
                                updateDraft(msg.id, draft.id, {
                                  category: e.target.value as SpendCategory,
                                })
                              }
                              className="h-8 px-2.5 rounded-full bg-[#FFFFFF] border border-[#E2E4E7] text-[12px] font-semibold text-[#181A1C] outline-none"
                            >
                              {ALL_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>

                            <select
                              aria-label="Account"
                              disabled={draft.saved}
                              value={draft.accountId}
                              onChange={(e) =>
                                updateDraft(msg.id, draft.id, {
                                  accountId: e.target.value,
                                })
                              }
                              className="h-8 px-2.5 rounded-full bg-[#FFFFFF] border border-[#E2E4E7] text-[12px] font-semibold text-[#181A1C] outline-none max-w-[140px]"
                            >
                              {state.accounts.map((acc: Account) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name}
                                </option>
                              ))}
                            </select>

                            {draft.saved ? (
                              <span className="h-8 px-3 rounded-full bg-[#DBFCE1] text-[#006B31] text-[12px] font-semibold inline-flex items-center gap-1">
                                <Check size={13} />
                                <span>Added</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  commitDraftsForMessage(msg.id, [draft])
                                }
                                className="h-8 px-3 rounded-full bg-[#00A24E] hover:bg-[#159A49] text-[#FFFFFF] text-[12px] font-semibold cursor-pointer"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Suggested Follow-Ups */}
              {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.suggestedFollowUps.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void handleSend(q)}
                      disabled={sending}
                      className="min-h-[34px] px-3.5 rounded-full bg-[#FFFFFF] border border-[#E2E4E7] hover:bg-[#DBFCE1] hover:border-[#00A24E] text-[12px] font-semibold text-[#181A1C] transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {sending && (
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[18px] bg-[#F3F5F7] text-[13px] font-medium text-[#66686D]">
            <Loader2 size={15} className="animate-spin text-[#00A24E]" />
            <span>Reading data & calculating advice...</span>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Starter Prompt Bar (shown when conversation is fresh) */}
      {messages.length <= 1 && (
        <div className="px-5 pb-3 flex items-center gap-2 overflow-x-auto">
          {STARTER_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => void handleSend(p)}
              disabled={sending}
              className="min-h-[34px] px-3.5 rounded-full bg-[#F3F5F7] hover:bg-[#DBFCE1] text-[12px] font-semibold text-[#181A1C] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Pending Attachment Preview */}
      {attachment && (
        <div className="mx-5 mb-2 p-2.5 rounded-[16px] bg-[#F3F5F7] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {attachment.previewUrl ? (
              <img
                src={attachment.previewUrl}
                alt={attachment.fileName}
                className="w-10 h-10 rounded-[10px] object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-[10px] bg-[#FFFFFF] flex items-center justify-center shrink-0">
                <FileText size={18} className="text-[#00A24E]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#181A1C] truncate">
                {attachment.fileName}
              </p>
              <p className="text-[11px] text-[#66686D]">
                Ready to read & categorize
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Remove attachment"
            onClick={() => setAttachment(null)}
            className="w-8 h-8 rounded-full hover:bg-[#E2E4E7] flex items-center justify-center text-[#66686D] cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Input Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="p-4 border-t border-[#E2E4E7] flex items-center gap-2"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.csv,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          title="Upload receipt, ticket, or bank statement"
          aria-label="Upload receipt or statement"
          onClick={() => fileInputRef.current?.click()}
          className="w-11 h-11 rounded-full bg-[#F3F5F7] hover:bg-[#DBFCE1] text-[#181A1C] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
        >
          <Paperclip size={18} />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type an expense, ask for advice, or attach a ticket..."
          className="flex-1 h-11 px-4 rounded-full bg-[#F3F5F7] border border-transparent focus:bg-[#FFFFFF] focus:border-[#00A24E] text-[14px] text-[#181A1C] placeholder:text-[#66686D] outline-none"
        />

        <button
          type="submit"
          disabled={sending || (!input.trim() && !attachment)}
          aria-label="Send message"
          className="w-11 h-11 rounded-full bg-[#00A24E] hover:bg-[#159A49] disabled:opacity-45 text-[#FFFFFF] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}
