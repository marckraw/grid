'use client';

import React from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceIndicatorProps {
  state: VoiceState;
  text?: string;
}

export function VoiceIndicator({ state, text }: VoiceIndicatorProps) {
  const getIcon = () => {
    switch (state) {
      case 'listening':
        return (
          <div className="voice-indicator listening">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            <span>Listening...</span>
          </div>
        );
      
      case 'processing':
        return (
          <div className="voice-indicator processing">
            <div className="spinner" />
            <span>Processing...</span>
          </div>
        );
      
      case 'speaking':
        return (
          <div className="voice-indicator speaking">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0070f3"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            <span>{text || 'Speaking...'}</span>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (state === 'idle') return null;

  return (
    <div className="voice-indicator-container">
      {getIcon()}
      
      <style jsx>{`
        .voice-indicator-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 1rem;
          background-color: #f3f4f6;
          border-radius: 8px;
          margin: 0.5rem 0;
          animation: fadeIn 0.3s ease;
        }

        .voice-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #4b5563;
        }

        .voice-indicator.listening {
          color: #ef4444;
        }

        .voice-indicator.listening svg {
          animation: pulse 1.5s infinite;
        }

        .voice-indicator.speaking {
          color: #0070f3;
        }

        .voice-indicator.speaking svg {
          animation: soundWave 1s infinite;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e5e7eb;
          border-top-color: #6b7280;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes soundWave {
          0% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.05);
          }
          50% {
            transform: scale(1);
          }
          75% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}