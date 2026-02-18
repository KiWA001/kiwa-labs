'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'admin';
  content: string;
  timestamp?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    preferredContact?: string;
  };
}

interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  lastUpdated: string;
  status?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    preferredContact?: string;
  };
}

export default function AdminPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Password from user
  const ADMIN_PASSWORD = 'Aaaaa1$.';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setShowSidebar(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
      const interval = setInterval(fetchSessions, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedSession?.messages]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        
        if (selectedSession) {
          const updated = data.sessions.find((s: ChatSession) => s.sessionId === selectedSession.sessionId);
          if (updated) {
            setSelectedSession(updated);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert('Invalid password');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminInput.trim() || !selectedSession) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'admin',
      content: adminInput.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedSession = {
      ...selectedSession,
      messages: [...selectedSession.messages, newMessage],
      lastUpdated: new Date().toISOString()
    };
    setSelectedSession(updatedSession);
    setAdminInput('');

    try {
      await fetch('/api/admin/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession.sessionId,
          message: newMessage
        }),
      });
      
      fetchSessions();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSessionSelect = (session: ChatSession) => {
    setSelectedSession(session);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const getMessageLabel = (role: string) => {
    switch (role) {
      case 'user': return 'User';
      case 'assistant': return 'K-AI';
      case 'admin': return 'KiWA Team';
      default: return role;
    }
  };

  const getMessageBackground = (role: string) => {
    switch (role) {
      case 'user': return '#000';
      case 'assistant': return '#f0f0f0';
      case 'admin': return '#0066cc';
      default: return '#f0f0f0';
    }
  };

  const getMessageColor = (role: string) => {
    switch (role) {
      case 'user': return '#fff';
      case 'assistant': return '#000';
      case 'admin': return '#fff';
      default: return '#000';
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
        padding: '20px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: '#ffffff',
            padding: isMobile ? '30px 20px' : '40px',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            width: '100%',
            maxWidth: '400px',
          }}
        >
          <h1 style={{
            fontSize: isMobile ? '1.3rem' : '1.5rem',
            fontWeight: 600,
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            KiWA Labs Admin
          </h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1rem',
                marginBottom: '16px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Login
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e0e0e0',
        padding: isMobile ? '15px 20px' : '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isMobile && selectedSession && (
            <button
              onClick={() => {
                setSelectedSession(null);
                setShowSidebar(true);
              }}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              ← Back
            </button>
          )}
          <h1 style={{
            fontSize: isMobile ? '1.1rem' : '1.5rem',
            fontWeight: 600,
            margin: 0,
          }}>
            {isMobile && selectedSession ? 'Chat' : 'KiWA Labs - Chat Admin'}
          </h1>
        </div>
        <button
          onClick={() => setIsAuthenticated(false)}
          style={{
            padding: isMobile ? '6px 12px' : '8px 16px',
            backgroundColor: 'transparent',
            border: '1px solid #000',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: isMobile ? '0.85rem' : '0.9rem',
          }}
        >
          Logout
        </button>
      </div>

      <div style={{
        display: 'flex',
        height: isMobile ? 'calc(100vh - 60px)' : 'calc(100vh - 73px)',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        {/* Sidebar - Session List */}
        {(!isMobile || (isMobile && showSidebar && !selectedSession)) && (
          <div style={{
            width: isMobile ? '100%' : '350px',
            backgroundColor: '#ffffff',
            borderRight: isMobile ? 'none' : '1px solid #e0e0e0',
            overflowY: 'auto',
            display: isMobile && selectedSession ? 'none' : 'block',
          }}>
            <div style={{
              padding: isMobile ? '15px' : '20px',
              borderBottom: '1px solid #e0e0e0',
              fontWeight: 600,
              fontSize: isMobile ? '0.9rem' : '1rem',
            }}>
              Conversations ({sessions.length})
            </div>
            
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                No conversations yet
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.sessionId}
                  onClick={() => handleSessionSelect(session)}
                  style={{
                    padding: isMobile ? '12px 15px' : '16px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    backgroundColor: selectedSession?.sessionId === session.sessionId ? '#f5f5f5' : 'transparent',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#666',
                    marginBottom: '4px',
                  }}>
                    {new Date(session.lastUpdated).toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: isMobile ? '0.9rem' : '0.95rem',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {session.messages[0]?.content.substring(0, 40)}...
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#888',
                    marginTop: '4px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                  }}>
                    <span>{session.messages.length} msgs</span>
                    {session.status === 'handoff_requested' && (
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: '#000',
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                      }}>
                        Handoff
                      </span>
                    )}
                    {session.contactInfo && (
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: '#0066cc',
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                      }}>
                        {session.contactInfo.preferredContact?.substring(0, 15)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Main Chat View */}
        {(!isMobile || (isMobile && selectedSession)) && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            width: isMobile ? '100%' : 'auto',
          }}>
            {selectedSession ? (
              <>
                {/* Session Header */}
                <div style={{
                  padding: isMobile ? '15px' : '20px',
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: '#fafafa',
                }}>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#666',
                  }}>
                    Session: {selectedSession.sessionId.substring(0, 20)}...
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#666',
                    marginTop: '4px',
                  }}>
                    {new Date(selectedSession.lastUpdated).toLocaleString()}
                  </div>
                  {selectedSession.status === 'handoff_requested' && (
                    <div style={{
                      marginTop: '8px',
                      padding: '6px 10px',
                      backgroundColor: '#000',
                      color: '#fff',
                      borderRadius: '6px',
                      display: 'inline-block',
                      fontSize: '0.8rem',
                    }}>
                      User requested handoff
                    </div>
                  )}
                  {selectedSession.contactInfo && (
                    <div style={{
                      marginTop: '8px',
                      padding: '10px',
                      backgroundColor: '#e8f4fd',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                    }}>
                      <strong>Contact:</strong> {selectedSession.contactInfo.preferredContact}
                      {selectedSession.contactInfo.email && <><br/>Email: {selectedSession.contactInfo.email}</>}
                      {selectedSession.contactInfo.whatsapp && <><br/>WhatsApp: {selectedSession.contactInfo.whatsapp}</>}
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: isMobile ? '15px' : '20px',
                }}>
                  {selectedSession.messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        marginBottom: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div style={{
                        maxWidth: isMobile ? '85%' : '70%',
                        backgroundColor: getMessageBackground(message.role),
                        color: getMessageColor(message.role),
                        padding: '10px 14px',
                        borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        fontSize: '0.9rem',
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                      }}>
                        {message.content}
                      </div>
                      <div style={{
                        fontSize: '0.7rem',
                        color: '#888',
                        marginTop: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        {message.role === 'admin' && (
                          <span style={{
                            width: '14px',
                            height: '14px',
                            backgroundColor: '#0066cc',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            color: '#fff',
                          }}>
                            👤
                          </span>
                        )}
                        {getMessageLabel(message.role)} • {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Admin Input */}
                <div style={{
                  padding: isMobile ? '12px 15px' : '16px 20px',
                  borderTop: '1px solid #e0e0e0',
                  backgroundColor: '#fafafa',
                }}>
                  <form onSubmit={handleSendMessage} style={{
                    display: 'flex',
                    gap: '10px',
                  }}>
                    <input
                      type="text"
                      value={adminInput}
                      onChange={(e) => setAdminInput(e.target.value)}
                      placeholder="Type your response..."
                      style={{
                        flex: 1,
                        padding: isMobile ? '10px 12px' : '12px 16px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '24px',
                        fontSize: '0.95rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!adminInput.trim()}
                      style={{
                        padding: isMobile ? '10px 16px' : '12px 24px',
                        backgroundColor: adminInput.trim() ? '#0066cc' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '24px',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        cursor: adminInput.trim() ? 'pointer' : 'default',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
                padding: '20px',
                textAlign: 'center',
              }}>
                {isMobile ? 'Select a conversation from the list' : 'Select a conversation to view details'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
