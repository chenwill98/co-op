'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type {
  AnalyticsChatResponse,
  AnalyticsContext,
  AnalyticsRenderHint,
  AnalyticsTabularResult,
} from '@/app/lib/analytics/types';
import AnalyticsMessage from './AnalyticsMessage';

type ChatItem = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  result?: AnalyticsTabularResult;
  renderHint?: AnalyticsRenderHint;
};

type PromptGroup = {
  title: string;
  prompts: string[];
};

const THREAD_KEY = 'analyticsThreadId';

function generateThreadId(): string {
  return `analytics-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getInitialThreadId(): string {
  if (typeof window === 'undefined') return '';
  const existing = localStorage.getItem(THREAD_KEY);
  if (existing) return existing;
  const created = generateThreadId();
  localStorage.setItem(THREAD_KEY, created);
  return created;
}

export default function AnalyticsChatBox() {
  const [threadId, setThreadId] = useState<string>(() => getInitialThreadId());
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [context, setContext] = useState<AnalyticsContext>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const promptGroups = useMemo<PromptGroup[]>(
    () => [
      {
        title: 'Snapshot',
        prompts: [
          'What is the average rent in Brooklyn right now?',
          'Top 10 neighborhoods by median rent in Queens',
        ],
      },
      {
        title: 'Trend',
        prompts: [
          'Show monthly trend of average pet-friendly rents over the last year',
          'Compare monthly average rents for Manhattan vs Brooklyn',
        ],
      },
      {
        title: 'Map',
        prompts: [
          'Show a heatmap of high-price rentals in Manhattan',
          'Show a bubble map of average rent by neighborhood in Brooklyn',
        ],
      },
    ],
    []
  );

  const renderedMessages = useMemo(
    () =>
      messages.map((message) => (
        <AnalyticsMessage
          key={message.id}
          messageId={message.id}
          role={message.role}
          text={message.text}
          result={message.result}
          renderHint={message.renderHint}
        />
      )),
    [messages]
  );

  useEffect(() => {
    if (!threadId && typeof window !== 'undefined') {
      const created = getInitialThreadId();
      setThreadId(created);
    }
  }, [threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const resetConversation = () => {
    const nextThread = generateThreadId();
    setMessages([]);
    setContext({});
    setThreadId(nextThread);
    setError(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THREAD_KEY, nextThread);
    }
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading || !threadId) return;

      setLoading(true);
      setError(null);

      const userMessage: ChatItem = {
        id: crypto.randomUUID(),
        role: 'user',
        text,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');

      try {
        const response = await fetch('/api/analytics/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: text,
            threadId,
            existingContext: context,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(payload.details || payload.error || 'Failed to fetch analytics response');
        }

        const payload = (await response.json()) as AnalyticsChatResponse;

        const assistantMessage: ChatItem = {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: payload.answerText,
          result: payload.result,
          renderHint: payload.renderHint,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setContext(payload.context ?? {});
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown analytics error';
        setError(message);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: `Error: ${message}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [context, loading, threadId]
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="glass-card rounded-3xl border border-base-300/45 p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <SparklesIcon className="h-5 w-5" />
              <span className="font-semibold tracking-wide text-sm uppercase">Analytics Workspace</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-base-content">Analytics for Nerds</h2>
            <p className="text-sm text-base-content/70 mt-1">
              Ask aggregate housing questions and get polished charts, maps, and tables in-chat.
            </p>
          </div>
          <button className="btn btn-sm rounded-full" onClick={resetConversation} type="button">
            New Thread
          </button>
        </div>

        {messages.length === 0 && (
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            {promptGroups.map((group) => (
              <div
                key={group.title}
                className="glass-panel-nested rounded-2xl p-4"
              >
                <div className="text-xs uppercase tracking-wide text-base-content/60 mb-2">{group.title}</div>
                <div className="flex flex-wrap gap-2">
                  {group.prompts.map((prompt) => (
                    <button
                      key={prompt}
                      className="glass-panel-nested rounded-xl px-3 py-2 text-left text-sm text-base-content/80 transition-all hover:border-primary/40 hover:text-primary hover:brightness-[0.96] disabled:opacity-50"
                      onClick={() => sendMessage(prompt)}
                      type="button"
                      disabled={loading}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="glass-badge-error rounded-xl px-4 py-2 mb-3 text-sm">{error}</div>}

        <div className="mb-3 max-h-[58vh] space-y-4 overflow-y-auto pr-1">
          {renderedMessages}

          {loading && (
            <div className="max-w-3xl glass-panel-nested rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm text-base-content/70 mb-2">
                <span className="loading loading-spinner loading-sm"></span>
                Preparing visuals...
              </div>
              <div className="space-y-2">
                <div className="skeleton h-4 w-3/4 rounded-full" />
                <div className="skeleton h-4 w-2/3 rounded-full" />
                <div className="skeleton h-40 w-full rounded-xl" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-0 glass-panel-nested rounded-2xl p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  sendMessage(input);
                }
              }}
              className="input input-bordered h-11 w-full border-base-300/70 bg-base-100/90 text-base-content placeholder:text-base-content/45 focus:border-primary/40 focus:outline-none"
              placeholder="Ask an aggregate question (e.g., top neighborhoods by median rent)..."
              disabled={loading}
            />
            <button
              className="btn btn-circle bg-primary/80 text-primary-content border border-white/10 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.1)] hover:bg-primary/90"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              type="button"
            >
              <ArrowUpIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
