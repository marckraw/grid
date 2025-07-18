import React from 'react';
import type { ProgressMessage } from '@mrck-labs/grid-core';

interface ProgressIndicatorProps {
  progress: ProgressMessage | null;
}

export function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  if (!progress) return null;

  const getProgressStyle = () => {
    switch (progress.type) {
      case 'thinking':
        return { color: '#666', emoji: '💭' };
      case 'tool_execution':
        return { color: '#f39c12', emoji: '🔧' };
      case 'error':
        return { color: '#e74c3c', emoji: '❌' };
      case 'iteration':
        return { color: '#3498db', emoji: '🔄' };
      case 'llm_response':
        return { color: '#27ae60', emoji: '✨' };
      default:
        return { color: '#666', emoji: '📝' };
    }
  };

  const { color, emoji } = getProgressStyle();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        marginBottom: '0.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color,
        animation: 'fadeIn 0.3s ease-in',
      }}
    >
      <span style={{ marginRight: '0.5rem', fontSize: '1rem' }}>{emoji}</span>
      <span>{progress.content}</span>
      {progress.type === 'thinking' && (
        <span style={{ marginLeft: '0.5rem', animation: 'pulse 1.5s infinite' }}>
          ...
        </span>
      )}
    </div>
  );
}