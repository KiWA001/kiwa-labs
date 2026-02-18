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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Password from user
  const ADMIN_PASSWORD = 'Aaaaa1$.';

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
      // Poll for new messages every 5 seconds
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
        
        // Update selected session if it exists
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

    // Optimistically update UI
    const updatedSession = {
      ...selectedSession,
      messages: [...selectedSession.messages, newMessage],
      lastUpdated: new Date().toISOString()
    };
    setSelectedSession(updatedSession);
    setAdminInput('');

    // Save to backend
    try {
      await fetch('/api/admin/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession.sessionId,
          message: newMessage
        }),
      });
      
      // Refresh sessions
      fetchSessions();
    } catch (error) {
      console.error('Failed to send message:', error);
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
      case 'admin': return '#0066cc'; // Blue for admin
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
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: '#ffffff',
            padding: '40px',
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
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          margin: 0,
        }}>
          KiWA Labs - Chat Admin
        </h1>
        <button
          onClick={() => setIsAuthenticated(false)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: '1px solid #000',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Logout
        </button>
      </div>

      <div style={{
        display: 'flex',
        height: 'calc(100vh - 73px)',
      }}>
        {/* Sidebar - Session List */}
        <div style={{
          width: '350px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e0e0e0',
          overflowY: 'auto',
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
            fontWeight: 600,
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
                onClick={() => setSelectedSession(session)}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  backgroundColor: selectedSession?.sessionId === session.sessionId ? '#f5f5f5' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
              >
                <div style={{
                  fontSize: '0.85rem',
                  color: '#666',
                  marginBottom: '4px',
                }}>
                  {new Date(session.lastUpdated).toLocaleString()}
                </div>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {session.messages[0]?.content.substring(0, 50)}...
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#888',
                  marginTop: '4px',
                }}>
                  {session.messages.length} messages
                  {session.status === 'handoff_requested' && (
                    <span style={{
                      marginLeft: '8px',
                      padding: '2px 8px',
                      backgroundColor: '#000',
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                    }}>
                      Handoff
                    </span>
                  )}
                  {session.contactInfo && (
                    <span style={{
                      marginLeft: '8px',
                      padding: '2px 8px',
                      backgroundColor: '#0066cc',
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                    }}>
                      Has Contact
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Main Chat View */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
        }}>
          {selectedSession ? (
            <>
              {/* Session Header */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#fafafa',
              }}>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#666',
                }}>
                  Session ID: {selectedSession.sessionId}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#666',
                  marginTop: '4px',
                }}>
                  Last updated: {new Date(selectedSession.lastUpdated).toLocaleString()}
                </div>
                {selectedSession.status === 'handoff_requested' && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#000',
                    color: '#fff',
                    borderRadius: '6px',
                    display: 'inline-block',
                    fontSize: '0.85rem',
                  }}>
                    User requested team handoff
                  </div>
                )}
                {selectedSession.contactInfo && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: '#e8f4fd',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                  }}>
                    <strong>Contact Information:</strong><br />
                    {selectedSession.contactInfo.email && <>Email: {selectedSession.contactInfo.email}<br /></>}
                    {selectedSession.contactInfo.phone && <>Phone: {selectedSession.contactInfo.phone}<br /></>}
                    {selectedSession.contactInfo.whatsapp && <>WhatsApp: {selectedSession.contactInfo.whatsapp}<br /></>}
                    {selectedSession.contactInfo.preferredContact && <>Preferred: {selectedSession.contactInfo.preferredContact}</>}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
              }}>
                {selectedSession.messages.map((message, index) => (
                  <div
                    key={message.id}
                    style={{
                      marginBottom: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      backgroundColor: getMessageBackground(message.role),
                      color: getMessageColor(message.role),
                      padding: '12px 16px',
                      borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: '0.95rem',
                      lineHeight: 1.5,
                    }}>
                      {message.content}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#888',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      {message.role === 'admin' && (
                        <span style={{
                          width: '16px',
                          height: '16px',
                          backgroundColor: '#0066cc',
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
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
                padding: '16px 20px',
                borderTop: '1px solid #e0e0e0',
                backgroundColor: '#fafafa',
              }}>
                <form onSubmit={handleSendMessage} style={{
                  display: 'flex',
                  gap: '12px',
                }}>
                  <input
                    type="text"
                    value={adminInput}
                    onChange={(e) => setAdminInput(e.target.value)}
                    placeholder="Type your response as KiWA Team..."
                    style={{
                      flex: 1,
                      padding: '12px 16px',
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
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      cursor: adminInput.trim() ? 'pointer' : 'default',
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
            }}>
              Select a conversation to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
