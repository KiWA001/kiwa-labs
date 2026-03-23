'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'admin';
  content: string;
  timestamp?: string;
}

interface ChatSession {
  session_id: string;
  sessionId?: string;
  messages: ChatMessage[];
  last_updated?: string;
  lastUpdated?: string;
  status?: string;
  contact_info?: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    preferredContact?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    preferredContact?: string;
  };
}

const ADMIN_POLL_INTERVAL_MS = 1000;

export default function AdminPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ADMIN_PASSWORD = 'Aaaaa1$.';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-login if previously authenticated
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin-auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Check for passkey on mount
  useEffect(() => {
    const checkPasskey = async () => {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        try {
          const stored = localStorage.getItem('admin-passkey-registered');
          if (stored) {
            const credential = await navigator.credentials.get({
              publicKey: {
                challenge: new Uint8Array(32),
                rpId: window.location.hostname,
                userVerification: 'preferred',
                allowCredentials: []
              }
            });
            if (credential) {
              setIsAuthenticated(true);
            }
          }
        } catch (error) {
          console.log('Passkey auth failed or not available', error);
        }
      }
    };
    
    checkPasskey();
  }, []);

  // Fetch sessions when authenticated
  useEffect(() => {
    const checkSessions = async () => {
      if (!isAuthenticated) return;
      
      try {
        const response = await fetch(`/api/admin/sessions?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          const normalizedSessions = (data.sessions || []).map((session: ChatSession) => ({
            ...session,
            sessionId: session.session_id || session.sessionId,
            lastUpdated: session.last_updated || session.lastUpdated,
            contactInfo: session.contact_info || session.contactInfo
          }));
          setSessions(normalizedSessions);
          
          // Only update selected session reference if it exists
          setSelectedSession((prevSelected) => {
            if (!prevSelected) return null;
            const updated = normalizedSessions.find((s: ChatSession) => 
              s.sessionId === prevSelected.sessionId
            );
            return updated || prevSelected;
          });
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSessions();

    const interval = setInterval(checkSessions, ADMIN_POLL_INTERVAL_MS);
    const handleFocus = () => {
      void checkSessions();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkSessions();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedSession?.messages]);



  const registerPasskey = async () => {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      alert('Passkeys not supported in this browser');
      return;
    }

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: 'KiWA Labs Admin',
            id: window.location.hostname
          },
          user: {
            id: new Uint8Array(16),
            name: 'admin',
            displayName: 'KiWA Admin'
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred'
          }
        }
      });

      if (credential) {
        localStorage.setItem('admin-passkey-registered', 'true');
        alert('Passkey registered successfully!');
      }
    } catch (e) {
      console.error('Passkey registration failed:', e);
      alert('Failed to register passkey');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('admin-auth', 'true');
      if (window.confirm('Set up passkey for faster login?')) {
        registerPasskey();
      }
    } else {
      alert('Invalid password');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminInput.trim() || !selectedSession) return;

    const previousSelectedSession = selectedSession;
    const previousSessions = sessions;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'admin',
      content: adminInput.trim(),
      timestamp: new Date().toISOString()
    };

    // Optimistically update UI
    const updatedMessages = [...(selectedSession.messages || []), newMessage];
    const updatedSession = {
      ...selectedSession,
      messages: updatedMessages,
      lastUpdated: new Date().toISOString()
    };
    
    setSelectedSession(updatedSession);
    setAdminInput('');

    // Update sessions array to keep the message
    setSessions(prev => 
      prev.map(s => s.sessionId === selectedSession.sessionId ? updatedSession : s)
    );

    // Save via API
    try {
      const response = await fetch('/api/admin/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          sessionId: selectedSession.sessionId,
          message: newMessage
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save message');
      }

      const data = await response.json();
      const savedSession = data.data?.[0];

      if (savedSession) {
        const normalizedSession = {
          ...savedSession,
          sessionId: savedSession.session_id || savedSession.sessionId,
          lastUpdated: savedSession.last_updated || savedSession.lastUpdated,
          contactInfo: savedSession.contact_info || savedSession.contactInfo
        };

        setSelectedSession(normalizedSession);
        setSessions((prev) => {
          const withoutCurrent = prev.filter((session) => session.sessionId !== normalizedSession.sessionId);
          return [normalizedSession, ...withoutCurrent];
        });
      }
    } catch (error) {
      console.error('Send message error:', error);
      setSelectedSession(previousSelectedSession);
      setSessions(previousSessions);
      setAdminInput(newMessage.content);
      alert('Message failed to send. Please try again.');
    }
  };

  const handleSessionSelect = (session: ChatSession) => {
    setSelectedSession(session);
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

  // Mobile sliding pane CSS
  const globalStyles = `
    .admin-container {
      display: flex;
      height: 100dvh;
      overflow: hidden;
      flex-direction: row;
      background-color: #f5f5f5;
    }
    
    .sidebar-pane {
      width: 350px;
      height: 100%;
      background-color: #ffffff;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
      transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
      flex-shrink: 0;
    }
    
    .chat-pane {
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: #ffffff;
      transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
      position: relative;
    }

    @media (max-width: 768px) {
      .admin-container {
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
      }
      .sidebar-pane {
        width: 100%;
        position: absolute;
        top: env(safe-area-inset-top);
        bottom: env(safe-area-inset-bottom);
        z-index: 10;
      }
      .chat-pane {
        width: 100%;
        position: absolute;
        top: env(safe-area-inset-top);
        bottom: env(safe-area-inset-bottom);
        z-index: 20;
      }
      
      .pane-view-sidebar .sidebar-pane {
        transform: translateX(0);
      }
      .pane-view-sidebar .chat-pane {
        transform: translateX(100%);
      }
      
      .pane-view-chat .sidebar-pane {
        transform: translateX(-30%);
        opacity: 0.5;
      }
      .pane-view-chat .chat-pane {
        transform: translateX(0);
      }
    }
  `;

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
            fontSize: '1.5rem',
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
                marginBottom: '12px',
              }}
            >
              Login
            </button>
          </form>
          <div style={{
            textAlign: 'center',
            fontSize: '0.8rem',
            color: '#888',
            marginTop: '16px',
          }}>
            🔐 Passkey login available after first successful login
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="admin-wrapper" style={{
      minHeight: '100dvh',
      backgroundColor: '#f5f5f5',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
    }}>
      <style>{globalStyles}</style>
      
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
          {selectedSession && (
            <button
              className="mobile-back-btn"
              onClick={() => {
                setSelectedSession(null);
              }}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'block', // We'll manage visibility via CSS
              }}
            >
              ← Back
            </button>
          )}
          <h1 style={{
            fontSize: '1.2rem',
            fontWeight: 600,
            margin: 0,
          }}>
            <span className="desktop-title">KiWA Labs - Chat Admin</span>
            <span className="mobile-title">Chat</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={registerPasskey}
            style={{
              padding: '6px 12px',
              backgroundColor: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            🔐 Add Passkey
          </button>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              localStorage.removeItem('admin-auth');
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #000',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div 
        className={`admin-container ${selectedSession ? 'pane-view-chat' : 'pane-view-sidebar'}`}
      >
        {/* Sidebar - Session List */}
        <div className="sidebar-pane">
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
            fontWeight: 600,
            fontSize: '1rem',
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
                    padding: '16px 20px',
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
                    {new Date(session.lastUpdated || Date.now()).toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: isMobile ? '0.9rem' : '0.95rem',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {session.messages?.[0]?.content?.substring(0, 40) || 'No messages'}...
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#888',
                    marginTop: '4px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                  }}>
                    <span>{session.messages?.length || 0} msgs</span>
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
        {/* Main Chat View */}
        <div className="chat-pane">
          {selectedSession ? (
            <>
              {/* Session Header */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#fafafa',
              }}>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#666',
                  }}>
                    Session: {selectedSession.sessionId?.substring(0, 20)}...
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#666',
                    marginTop: '4px',
                  }}>
                    {new Date(selectedSession.lastUpdated || Date.now()).toLocaleString()}
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
                  {(selectedSession.messages || []).map((message, index) => (
                    <div
                      key={message.id || index}
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
                        padding: '12px 24px',
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
                <span className="mobile-title">Select a conversation from the list</span>
                <span className="desktop-title">Select a conversation to view details</span>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
