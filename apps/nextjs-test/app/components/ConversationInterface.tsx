'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ConversationMessage } from './ConversationMessage';
import { ProgressIndicator } from './ProgressIndicator';
import type { ChatMessage, ProgressMessage } from '@mrck-labs/grid-core';

export function ConversationInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<ProgressMessage | null>(null);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentProgress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle Server-Sent Events
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              try {
                const event = JSON.parse(data);

                switch (event.type) {
                  case 'progress':
                    setCurrentProgress(event.progress);
                    break;
                  case 'message':
                    setMessages(prev => [...prev, event.message]);
                    setCurrentProgress(null);
                    break;
                  case 'error':
                    console.error('Error:', event.error);
                    setCurrentProgress({
                      type: 'error' as const,
                      content: event.error,
                      timestamp: Date.now(),
                    } as ProgressMessage);
                    break;
                  case 'done':
                    setCurrentProgress(null);
                    break;
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setCurrentProgress({
        type: 'error' as const,
        content: error instanceof Error ? error.message : 'Failed to send message',
        timestamp: Date.now(),
      } as ProgressMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset the conversation?')) {
      try {
        await fetch(`/api/conversation?sessionId=${sessionId}`, {
          method: 'DELETE',
        });
        setMessages([]);
        setCurrentProgress(null);
      } catch (error) {
        console.error('Error resetting conversation:', error);
      }
    }
  };

  const handleExport = () => {
    const conversationData = {
      sessionId,
      messages,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(conversationData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div
        style={{
          padding: '1rem',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Grid Conversation</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleExport}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            Export
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          backgroundColor: '#ffffff',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#666',
              marginTop: '2rem',
            }}
          >
            <p>Start a conversation by typing a message below.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              I can help with calculations and tell you the current time!
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <ConversationMessage
            key={index}
            role={message.role as 'user' | 'assistant' | 'system'}
            content={message.content}
            toolCalls={message.toolCalls}
          />
        ))}

        {currentProgress && <ProgressIndicator progress={currentProgress} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '1rem',
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '1rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isLoading || !inputValue.trim() ? '#ccc' : '#0070f3',
              color: 'white',
              cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
            }}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}