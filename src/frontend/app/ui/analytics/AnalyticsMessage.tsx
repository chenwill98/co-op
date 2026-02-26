'use client';

import React from 'react';
import type {
  AnalyticsRenderHint,
  AnalyticsTabularResult,
} from '@/app/lib/analytics/types';
import AnalyticsResultRenderer from './AnalyticsResultRenderer';

interface AnalyticsMessageProps {
  messageId?: string;
  role: 'user' | 'assistant';
  text: string;
  result?: AnalyticsTabularResult;
  renderHint?: AnalyticsRenderHint;
}

function AnalyticsMessage({
  messageId,
  role,
  text,
  result,
  renderHint,
}: AnalyticsMessageProps) {
  const metadata = role === 'assistant' && result && renderHint
    ? [
        renderHint.primary.replace('_', ' '),
        `${result.rowCount} row${result.rowCount === 1 ? '' : 's'}`,
        ...(result.truncated ? ['truncated'] : []),
      ]
    : [];

  return (
    <div className={`chat ${role === 'user' ? 'chat-end' : 'chat-start'}`}>
      <div className="max-w-full space-y-2">
        <div
          className={`chat-bubble ${
            role === 'user'
              ? 'glass-chat-user'
              : 'glass-chat-assistant'
          }`}
        >
          <p className="leading-relaxed">{text}</p>
        </div>

        {role === 'assistant' && result && renderHint && (
          <div className="max-w-4xl glass-panel-nested rounded-2xl p-3 md:p-4">
            {metadata.length > 0 && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {metadata.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center glass-panel-nested rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide text-base-content/65"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
            <AnalyticsResultRenderer
              result={result}
              renderHint={renderHint}
              messageId={messageId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(AnalyticsMessage, (prev, next) => {
  return (
    prev.messageId === next.messageId &&
    prev.role === next.role &&
    prev.text === next.text &&
    prev.result === next.result &&
    prev.renderHint === next.renderHint
  );
});
