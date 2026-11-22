import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Check your API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const VALID_CATEGORIES = [
  'Groceries',
  'Dining Out',
  'Transit & Travel',
  'Home & Utilities',
  'Wellness',
  'Shopping',
  'Subscriptions',
  'Income',
  'Transfer',
] as const;

const app = express();
app.use(express.json({ limit: '15mb' }));

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history, attachment, financialContext } = req.body || {};

    if (!message && !attachment) {
      res.status(400).json({ error: 'Provide a message or attach a receipt/statement.' });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are Breeze Advisor, a calm, insightful, and precise personal wealth assistant inside the Breeze finance app.
Today's date in the app is 2026-11-21.

Capabilities:
1. Parse and categorize expenses or income from natural language text, receipt/ticket images, or bank/card statements (images, PDFs, or text/CSV).
2. Provide personalized, concrete financial advice grounded strictly in the user's real financial context provided below (accounts, balances, APY/APR, credit limits, November category budgets, upcoming bills, and savings goals).
3. Reply in the same language the user uses (if they write in Spanish, respond naturally in Spanish; if in English, respond in English; if they only upload a receipt without text, match the receipt language or default to Spanish/English clearly).

Rules for extractedTransactions:
- Extract every expense, income, or transfer found in the user's message or attached receipt/statement. If the user is only asking a question and not reporting a transaction or uploading a document, return an empty array [].
- Category MUST be one of: ${VALID_CATEGORIES.join(', ')}.
- Type MUST be 'expense', 'income', or 'transfer'.
- Date MUST be YYYY-MM-DD (default to '2026-11-21' if unclear on a receipt).
- accountId MUST be one of the user's actual account IDs from the financial context (choose the most logical match, e.g. credit card for retail/dining if mentioned, checking for utilities/transfers, or default to the primary checking/credit account).
- Amount must always be a positive number.
- Keep your conversational reply crisp, encouraging, and practical (no jargon or fluff). Reference specific dollar figures from their data when giving advice.`;

    const contextSummary = JSON.stringify(financialContext || {});
    const historySummary = Array.isArray(history)
      ? history
          .slice(-8)
          .map((h: { role: string; text: string }) => `${h.role}: ${h.text}`)
          .join('\n')
      : '';

    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [];

    if (attachment?.data && attachment?.mimeType) {
      if (attachment.mimeType === 'text/csv' || attachment.mimeType === 'text/plain') {
        const decodedText = Buffer.from(attachment.data, 'base64').toString('utf-8');
        parts.push({
          text: `Attached statement (${attachment.fileName || 'statement'}):\n${decodedText.slice(0, 24000)}`,
        });
      } else {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data,
          },
        });
      }
    }

    parts.push({
      text: `User Financial Context:\n${contextSummary}\n\nRecent Conversation:\n${historySummary}\n\nCurrent User Request:\n${message || 'Please read this attached receipt or bank statement, extract all transactions, and categorize them.'}`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Helpful advisor reply or summary of extracted transactions.',
            },
            extractedTransactions: {
              type: Type.ARRAY,
              description: 'Transactions parsed from text, receipt, or statement.',
              items: {
                type: Type.OBJECT,
                properties: {
                  merchant: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  type: { type: Type.STRING },
                  category: { type: Type.STRING },
                  date: { type: Type.STRING },
                  accountId: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['merchant', 'amount', 'type', 'category', 'date', 'accountId'],
              },
            },
            suggestedFollowUps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 or 3 short follow-up prompts for the user.',
            },
          },
          required: ['reply', 'extractedTransactions', 'suggestedFollowUps'],
        },
      },
    });

    const rawText = (response.text || '{}').trim();
    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI request failed.';
    console.error('Gemini /api/ai/chat error:', err);
    res.status(500).json({ error: message });
  }
});

app.post('/api/ai/insights', async (req, res) => {
  try {
    const { financialContext, language } = req.body || {};
    const ai = getGeminiClient();

    const preferredLang = language === 'es' ? 'Spanish' : 'English';

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze this user's live personal wealth snapshot (date: 2026-11-21) and generate 1 concise proactive advisor pulse line plus 4 actionable, specific financial insights in ${preferredLang}.\n\nFinancial Context:\n${JSON.stringify(
        financialContext || {}
      )}`,
      config: {
        systemInstruction: `You are Breeze's proactive AI Wealth Advisor.
Produce concrete, math-grounded financial observations using the exact balances, APY/APR rates, credit utilization, budget spend percentages, upcoming bills, and savings goals in the user's data.
Never invent fake accounts or fake numbers.
Keep tone optimistic, calm, and actionable.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headlineTip: {
              type: Type.STRING,
              description: 'A single concise 1-sentence proactive advisor observation.',
            },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  impactLabel: { type: Type.STRING },
                  category: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  suggestedQuestion: { type: Type.STRING },
                },
                required: [
                  'id',
                  'title',
                  'summary',
                  'impactLabel',
                  'category',
                  'priority',
                  'suggestedQuestion',
                ],
              },
            },
          },
          required: ['headlineTip', 'insights'],
        },
      },
    });

    const rawText = (response.text || '{}').trim();
    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate insights.';
    console.error('Gemini /api/ai/insights error:', err);
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Breeze server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
