'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'admin';
  content: string;
  timestamp?: string;
}

interface ContactInfo {
  email?: string;
  phone?: string;
  whatsapp?: string;
  preferredContact?: string;
}

interface AIChatProps {
  onClose: () => void;
}

// Contact Form Component
function ContactFormContent({ 
  contactInfo, 
  setContactInfo, 
  onSubmit
}: { 
  contactInfo: ContactInfo; 
  setContactInfo: (info: ContactInfo) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const [error, setError] = useState('');

  const handleMethodChange = (method: string) => {
    setError('');
    setContactInfo({...contactInfo, preferredContact: method});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactInfo.preferredContact || contactInfo.preferredContact === '') {
      setError('Please select a contact method first');
      return;
    }
    
    setError('');
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          fontSize: '0.9rem',
          fontWeight: 500,
          color: '#333',
          display: 'block',
          marginBottom: '12px',
        }}>
          How would you like us to reach you? *
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            border: contactInfo.preferredContact === 'email' ? '2px solid #000' : '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: contactInfo.preferredContact === 'email' ? '#f0f0f0' : '#fff',
          }}>
            <input
              type="radio"
              name="contactMethod"
              value="email"
              checked={contactInfo.preferredContact === 'email'}
              onChange={(e) => handleMethodChange(e.target.value)}
              style={{ marginRight: '10px' }}
            />
            <span style={{ fontSize: '0.9rem' }}>📧 Email</span>
          </label>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            border: contactInfo.preferredContact === 'whatsapp' ? '2px solid #000' : '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: contactInfo.preferredContact === 'whatsapp' ? '#f0f0f0' : '#fff',
          }}>
            <input
              type="radio"
              name="contactMethod"
              value="whatsapp"
              checked={contactInfo.preferredContact === 'whatsapp'}
              onChange={(e) => handleMethodChange(e.target.value)}
              style={{ marginRight: '10px' }}
            />
            <span style={{ fontSize: '0.9rem' }}>💬 WhatsApp</span>
          </label>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            border: contactInfo.preferredContact === 'continue_chat' ? '2px solid #000' : '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: contactInfo.preferredContact === 'continue_chat' ? '#f0f0f0' : '#fff',
          }}>
            <input
              type="radio"
              name="contactMethod"
              value="continue_chat"
              checked={contactInfo.preferredContact === 'continue_chat'}
              onChange={(e) => handleMethodChange(e.target.value)}
              style={{ marginRight: '10px' }}
            />
            <span style={{ fontSize: '0.9rem' }}>💭 Chat with a human here</span>
          </label>
        </div>
        {error && (
          <div style={{
            color: '#dc2626',
            fontSize: '0.85rem',
            marginTop: '8px',
          }}>
            {error}
          </div>
        )}
      </div>

      {contactInfo.preferredContact === 'email' && (
        <div style={{ marginBottom: '16px' }}>
          <input
            type="email"
            placeholder="Your email address *"
            value={contactInfo.email}
            onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '0.9rem',
            }}
            required
          />
        </div>
      )}

      {contactInfo.preferredContact === 'whatsapp' && (
        <div style={{ marginBottom: '16px' }}>
          <input
            type="tel"
            placeholder="Your WhatsApp number *"
            value={contactInfo.whatsapp}
            onChange={(e) => setContactInfo({...contactInfo, whatsapp: e.target.value})}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '0.9rem',
            }}
            required
          />
        </div>
      )}

      <button
        type="submit"
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '0.95rem',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Submit
      </button>
    </form>
  );
}

export default function AIChat({ onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [showHandoff, setShowHandoff] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: '',
    phone: '',
    whatsapp: '',
    preferredContact: 'email'
  });
  const [isWaitingForHuman, setIsWaitingForHuman] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate or retrieve session ID
  useEffect(() => {
    let storedSessionId = localStorage.getItem('kai-session-id');
    if (!storedSessionId) {
      storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('kai-session-id', storedSessionId);
    }
    setSessionId(storedSessionId);
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('kai-messages');
    
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
        timestamp: new Date().toISOString()
      }]);
    }
  }, []);

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('kai-messages', JSON.stringify(messages));
      // Also save to Supabase
      saveToSupabase(messages);
    }
  }, [messages]);

  // Poll for admin messages every 3 seconds
  useEffect(() => {
    if (!sessionId) return;
    
    const pollForAdminMessages = async () => {
      try {
        const response = await fetch(`/api/chat/poll?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.adminMessages && data.adminMessages.length > 0) {
            // Add admin messages to chat
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMessages = data.adminMessages.filter((m: Message) => !existingIds.has(m.id));
              if (newMessages.length > 0) {
                return [...prev, ...newMessages];
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error('Failed to poll for admin messages:', error);
      }
    };

    const interval = setInterval(pollForAdminMessages, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Save conversation to Supabase
  const saveToSupabase = async (msgs: Message[], contact?: ContactInfo) => {
    try {
      await fetch('/api/chat/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: msgs,
          timestamp: new Date().toISOString(),
          contactInfo: contact || null
        }),
      });
    } catch (error) {
      console.error('Failed to save to Supabase:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll only when user sends a message, not when AI responds
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user' || lastMessage?.role === 'admin') {
      scrollToBottom();
    }
  }, [messages]);

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      const welcomeMessage = {
        id: 'welcome',
        role: 'assistant' as const,
        content: "What would you like to build?",
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
      setShowHandoff(false);
      setShowContactForm(false);
      setIsWaitingForHuman(false); // Reset waiting for human
      localStorage.removeItem('kai-messages');
      // Clear from Supabase too
      saveToSupabase([welcomeMessage]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    
    // If waiting for human, don't call AI - just save the message
    if (isWaitingForHuman) {
      // Save to Supabase so admin can see the new message
      saveToSupabase([...messages, userMessage]);
      return;
    }
    
    setIsLoading(true);

    try {
      // Send full conversation history
      const fullConversation = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input.trim(),
          fullConversation,
          sessionId
        }),
      });

      const data = await response.json();

      if (data.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };

        setMessages((prev) => [...prev, assistantMessage]);
        
        // Show handoff option if AI suggests it
        if (data.readyForHandoff) {
          setShowHandoff(true);
        }
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I apologize, but I encountered an issue. Please try again.',
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an issue. Please try again.',
        timestamp: new Date().toISOString()
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

  const initiateHandoff = () => {
    setShowHandoff(false);
    setShowContactForm(true);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate based on selected method
    if (contactInfo.preferredContact === 'email' && !contactInfo.email) {
      alert('Please provide your email address');
      return;
    }
    
    if (contactInfo.preferredContact === 'whatsapp' && !contactInfo.whatsapp) {
      alert('Please provide your WhatsApp number');
      return;
    }

    let messageContent = '';
    let updatedContactInfo = { ...contactInfo };
    
    if (contactInfo.preferredContact === 'continue_chat') {
      // User wants to chat with human in this chat
      messageContent = "Perfect! A member of our KiWA Labs team will join this chat shortly to assist you. Please continue chatting here and we'll respond as soon as possible.";
      updatedContactInfo.preferredContact = 'Chat with a human here';
      setIsWaitingForHuman(true); // Stop AI from responding
    } else if (contactInfo.preferredContact === 'email') {
      messageContent = `Thank you! I've collected your contact information. Our team will reach out to you via email at ${contactInfo.email} within 24 hours.\n\nWe look forward to discussing your project in detail!`;
    } else if (contactInfo.preferredContact === 'whatsapp') {
      messageContent = `Thank you! I've collected your contact information. Our team will reach out to you via WhatsApp at ${contactInfo.whatsapp} within 24 hours.\n\nWe look forward to discussing your project in detail!`;
    }

    const handoffMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: messageContent,
      timestamp: new Date().toISOString()
    };
    
    setMessages((prev) => [...prev, handoffMessage]);
    setShowContactForm(false);
    
    // Save to Supabase with contact info
    try {
      await fetch('/api/chat/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: [...messages, handoffMessage],
          timestamp: new Date().toISOString(),
          status: 'handoff_requested',
          contactInfo
        }),
      });
    } catch (error) {
      console.error('Failed to save handoff:', error);
    }
  };

  // Prevent swipe gestures and iOS backswipe on the AI chat container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Block native iOS back swipe if touch starts very close to the left edge
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches[0] && e.touches[0].pageX < 25) {
        e.preventDefault();
      }
    };

    const preventSwipeBack = (e: Event) => {
      // Prevent iOS back swipe from closing AI page
      e.stopPropagation();
      e.preventDefault();
    };

    // Use capture phase and passive: false to ensure preventDefault works
    container.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    window.addEventListener('swipe-back', preventSwipeBack, true);
    window.addEventListener('edge-swipe-right', preventSwipeBack, true);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart, { capture: true });
      window.removeEventListener('swipe-back', preventSwipeBack, true);
      window.removeEventListener('edge-swipe-right', preventSwipeBack, true);
    };
  }, []);

  const getMessageBackground = (role: string) => {
    switch (role) {
      case 'user': return '#000000';
      case 'assistant': return '#f0f0f0';
      case 'admin': return '#0066cc'; // Blue for admin
      default: return '#f0f0f0';
    }
  };

  const getMessageColor = (role: string) => {
    switch (role) {
      case 'user': return '#ffffff';
      case 'assistant': return '#000000';
      case 'admin': return '#ffffff';
      default: return '#000000';
    }
  };

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
          position: 'fixed',
          top: '40px',
          left: '30px',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          height: '30px',
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.05rem',
            fontWeight: 500,
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '17px',
            height: '17px',
            padding: 0,
            lineHeight: 1,
            marginTop: '-2px',
          }}
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>
      <div
        style={{
          position: 'fixed',
          top: '40px',
          right: '30px',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          height: '30px',
        }}
      >
        <span
          onClick={handleClearChat}
          style={{
            fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: '1.2rem',
            fontWeight: 500,
            color: '#000000',
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >Clear</span>
      </div>

      {/* Messages Area - Scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '100px 20px 100px 20px',
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              style={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                backgroundColor: getMessageBackground(message.role),
                color: getMessageColor(message.role),
                padding: '12px 16px',
                borderRadius: message.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                wordBreak: 'break-word',
              }}
            >
              {message.role === 'admin' && (
                <div style={{
                  fontSize: '0.75rem',
                  opacity: 0.8,
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <span>👤</span> KiWA Team
                </div>
              )}
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p style={{ margin: 0, lineHeight: 1.5, wordWrap: 'break-word' }}>{children}</p>,
                  strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                  ol: ({ children }) => <ol style={{ margin: '8px 0', paddingLeft: '20px', lineHeight: 1.6 }}>{children}</ol>,
                  ul: ({ children }) => <ul style={{ margin: '8px 0', paddingLeft: '20px', lineHeight: 1.6 }}>{children}</ul>,
                  li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#f0f0f0',
              padding: '16px 20px',
              borderRadius: '20px 20px 20px 4px',
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#999',
                borderRadius: '50%',
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: '0s',
              }}
            />
            <span
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#999',
                borderRadius: '50%',
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: '0.2s',
              }}
            />
            <span
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#999',
                borderRadius: '50%',
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: '0.4s',
              }}
            />
          </motion.div>
        )}

        {/* Handoff Button */}
        {showHandoff && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              alignSelf: 'center',
              marginTop: '20px',
              padding: '16px 24px',
              backgroundColor: '#000000',
              color: '#ffffff',
              borderRadius: '30px',
              cursor: 'pointer',
              fontWeight: 500,
              textAlign: 'center',
            }}
            onClick={initiateHandoff}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Connect me with KiWA Labs Team →
          </motion.div>
        )}

        {/* Contact Info Form */}
        {showContactForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              alignSelf: 'center',
              marginTop: '20px',
              padding: '24px',
              backgroundColor: '#f8f8f8',
              borderRadius: '16px',
              maxWidth: '400px',
              width: '100%',
              border: '1px solid #e0e0e0',
            }}
          >
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              How should we reach you?
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: '#666',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              Choose your preferred contact method and provide your details.
            </p>
            <ContactFormContent 
              contactInfo={contactInfo}
              setContactInfo={setContactInfo}
              onSubmit={handleContactSubmit}
            />
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
        {/* Human agent option */}
        <div style={{
          maxWidth: '600px',
          margin: '0 auto 8px auto',
          textAlign: 'center',
        }}>
          <a
            href="mailto:kiwalabs@gmail.com"
            style={{
              fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '0.85rem',
              color: '#888',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            Prefer to email us directly? kiwalabs@gmail.com
          </a>
        </div>
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
        
        /* Mobile: Make X button bigger */
        @media (max-width: 768px) {
          button[aria-label="Close chat"] {
            font-size: 1.8rem !important;
            width: 44px !important;
            height: 44px !important;
          }
        }
      `}</style>
    </div>
  );
}
