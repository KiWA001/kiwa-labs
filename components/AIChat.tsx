'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import ParticleDustEffect from './ParticleDustEffect';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isNew?: boolean;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showParticleEffect, setShowParticleEffect] = useState(false);
  const [particleMode, setParticleMode] = useState<'form' | 'disperse'>('form');
  const [particleTarget, setParticleTarget] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiIconRef = useRef<HTMLDivElement>(null);

  const getAiIconPosition = useCallback(() => {
    if (aiIconRef.current) {
      const rect = aiIconRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    return { x: window.innerWidth - 55, y: 45 };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const triggerFormEffect = useCallback((targetX: number, targetY: number) => {
    const iconPos = getAiIconPosition();
    setParticleTarget({ x: targetX, y: targetY });
    setParticleMode('form');
    setShowParticleEffect(true);
  }, [getAiIconPosition]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      isNew: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Trigger particle effect for user message
    setTimeout(() => {
      const lastMessage = document.getElementById(`msg-${userMessage.id}`);
      if (lastMessage) {
        const rect = lastMessage.getBoundingClientRect();
        triggerFormEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    }, 50);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Sorry, I could not process your request.',
        isNew: true,
      };

      // Small delay to let previous effect finish
      setTimeout(() => {
        setMessages((prev) => [...prev, assistantMessage]);
        
        // Trigger effect for AI response
        setTimeout(() => {
          const aiMessageEl = document.getElementById(`msg-${assistantMessage.id}`);
          if (aiMessageEl) {
            const rect = aiMessageEl.getBoundingClientRect();
            triggerFormEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
          }
        }, 50);
      }, 800);

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        isNew: true,
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

  const handleParticleComplete = () => {
    setShowParticleEffect(false);
  };

  return (
    <>
      <ParticleDustEffect
        isActive={showParticleEffect}
        sourceX={getAiIconPosition().x}
        sourceY={getAiIconPosition().y}
        targetX={particleTarget.x}
        targetY={particleTarget.y}
        mode={particleMode}
        onComplete={handleParticleComplete}
        particleCount={200}
        color="#000000"
      />
      
      <div
        ref={containerRef}
        style={{
          width: '100%',
          minHeight: 'calc(100vh - 280px)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          position: 'relative',
          paddingTop: '20px',
        }}
      >
        {/* AI Icon - Right side opposite to numbered menus */}
        <div
          ref={aiIconRef}
          style={{
            position: 'absolute',
            top: '20px',
            right: '10px',
            width: '50px',
            height: '50px',
            zIndex: 10,
          }}
        >
          <Image
            src="/Aiicon.png"
            alt="KiWA Labs AI"
            width={50}
            height={50}
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Messages Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '0 10px 180px 10px',
          }}
        >
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                id={`msg-${message.id}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  transition: {
                    duration: 0.5,
                    delay: message.isNew ? 0.3 : 0,
                    ease: [0.16, 1, 0.3, 1]
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.8,
                  transition: { duration: 0.3 }
                }}
                style={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '16px 20px',
                  borderRadius: '20px',
                  backgroundColor: message.role === 'user' ? '#000000' : '#f0f0f0',
                  color: message.role === 'user' ? '#ffffff' : '#000000',
                  fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  boxShadow: message.isNew ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {message.content}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                alignSelf: 'flex-start',
                padding: '16px 20px',
                borderRadius: '20px',
                backgroundColor: '#f0f0f0',
                display: 'flex',
                gap: '4px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#999',
                  animation: 'bounce 1.4s infinite ease-in-out both',
                }}
              />
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#999',
                  animation: 'bounce 1.4s infinite ease-in-out both 0.16s',
                }}
              />
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#999',
                  animation: 'bounce 1.4s infinite ease-in-out both 0.32s',
                }}
              />
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Container - Fixed at bottom within the scrollable content */}
        <div
          style={{
            position: 'sticky',
            bottom: '20px',
            left: '0',
            right: '0',
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto',
            zIndex: 20,
            padding: '0 10px',
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#e0e0e0',
              borderRadius: '30px',
              padding: '8px 8px 8px 24px',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message KiWA Labs AI"
              disabled={isLoading}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '1rem',
                fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
                color: '#000000',
                padding: '12px 0',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: input.trim() && !isLoading ? '#000000' : '#999999',
                color: '#ffffff',
                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s',
                flexShrink: 0,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>

        {/* Add bounce animation */}
        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}</style>
      </div>
    </>
  );
}
