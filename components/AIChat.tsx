'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  onClose: () => void;
}

export default function AIChat({ onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextSummary, setContextSummary] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('kai-messages');
    const savedContext = localStorage.getItem('kai-context');
    
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
      } catch (e) {
        console.error('Failed to parse saved messages');
      }
    } else {
      // Set welcome message if no history
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "What would you like to build?",
      }]);
    }
    
    if (savedContext) {
      setContextSummary(savedContext);
    }
  }, []);

  // Save to localStorage whenever messages or context changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('kai-messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('kai-context', contextSummary);
  }, [contextSummary]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "What would you like to build?",
      }]);
      setContextSummary('');
      localStorage.removeItem('kai-messages');
      localStorage.removeItem('kai-context');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get last 2 messages for context
      const recentMessages = messages.slice(-2);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input.trim(),
          contextSummary,
          recentMessages: recentMessages.map(m => ({ role: m.role, content: m.content }))
        }),
      });

      const data = await response.json();

      if (data.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        
        // Update context summary if provided
        if (data.contextSummary) {
          setContextSummary(data.contextSummary);
        }
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I apologize, but I encountered an issue. Please try again.',
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an issue. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Prevent swipe gestures on the AI chat container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventSwipe = (e: TouchEvent) => {
      // Prevent default swipe behavior
      e.stopPropagation();
    };

    container.addEventListener('touchstart', preventSwipe, { passive: false });
    container.addEventListener('touchmove', preventSwipe, { passive: false });
    container.addEventListener('touchend', preventSwipe, { passive: false });

    return () => {
      container.removeEventListener('touchstart', preventSwipe);
      container.removeEventListener('touchmove', preventSwipe);
      container.removeEventListener('touchend', preventSwipe);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header with Close and Clear buttons */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #f0f0f0',
          zIndex: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2rem',
            color: '#000',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close chat"
        >
          ✕
        </button>
        <span
          style={{
            fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
            fontSize: '1rem',
            fontWeight: 500,
            color: '#000',
          }}
        >
          K-AI
        </span>
        <button
          onClick={handleClearChat}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            color: '#666',
            padding: '8px 12px',
            borderRadius: '12px',
            fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
          }}
          aria-label="Clear chat"
        >
          Clear
        </button>
      </div>

      {/* Messages Area - Scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '80px 20px 100px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: '18px',
                backgroundColor: message.role === 'user' ? '#000000' : '#f0f0f0',
                color: message.role === 'user' ? '#ffffff' : '#000000',
                fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
                fontSize: '0.95rem',
                lineHeight: 1.5,
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                marginTop: index === 0 && message.id === 'welcome' ? '20px' : '0',
              }}
            >
              {message.role === 'assistant' ? (
                <div 
                  className="markdown-content"
                  style={{
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <ReactMarkdown
                    components={{
                      strong: ({ children }) => (
                        <strong style={{ fontWeight: 600, display: 'inline' }}>
                          {children}
                        </strong>
                      ),
                      code: ({ children }) => (
                        <code 
                          style={{ 
                            backgroundColor: 'rgba(0,0,0,0.1)', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '0.85em',
                            display: 'inline',
                            wordBreak: 'break-all',
                          }}
                        >
                          {children}
                        </code>
                      ),
                      p: ({ children }) => (
                        <p style={{ margin: 0, display: 'inline' }}>{children}</p>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <span style={{ wordBreak: 'break-word' }}>{message.content}</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              alignSelf: 'flex-start',
              padding: '12px 16px',
              borderRadius: '18px',
              backgroundColor: '#f0f0f0',
              display: 'flex',
              gap: '4px',
            }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#999',
              animation: 'bounce 1.4s infinite ease-in-out both',
            }} />
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#999',
              animation: 'bounce 1.4s infinite ease-in-out both 0.16s',
            }} />
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#999',
              animation: 'bounce 1.4s infinite ease-in-out both 0.32s',
            }} />
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px 20px 16px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #f0f0f0',
          zIndex: 10,
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message K-AI..."
            disabled={isLoading}
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: '#f0f0f0',
              borderRadius: '20px',
              padding: '10px 16px',
              outline: 'none',
              fontSize: '0.95rem',
              fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
              color: '#000000',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: input.trim() && !isLoading ? '#000000' : '#cccccc',
              color: '#ffffff',
              cursor: input.trim() && !isLoading ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
              flexShrink: 0,
              padding: '0',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
