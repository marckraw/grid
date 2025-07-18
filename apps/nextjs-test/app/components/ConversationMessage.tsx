import React from 'react';

interface ConversationMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string | null;
  toolCalls?: Array<{
    toolName: string;
    toolCallId: string;
  }>;
}

export function ConversationMessage({ role, content, toolCalls }: ConversationMessageProps) {
  if (role === 'system') return null; // Don't display system messages

  const isUser = role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '1rem',
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          backgroundColor: isUser ? '#0070f3' : '#f0f0f0',
          color: isUser ? 'white' : 'black',
          wordBreak: 'break-word',
        }}
      >
        {content && <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>}
        
        {toolCalls && toolCalls.length > 0 && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
            {toolCalls.map((toolCall) => (
              <div key={toolCall.toolCallId}>
                🔧 Using {toolCall.toolName}...
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}