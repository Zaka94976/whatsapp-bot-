import React, { useState, useEffect } from 'react';
import './WhatsAppDashboard.css';

const API_URL = 'http://localhost:3000/api/alldata';

function WhatsAppDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="wa-dashboard">
        <div className="wa-loading">
          <div className="wa-spinner"></div>
          <p>Loading WhatsApp Bot Data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wa-dashboard">
        <div className="wa-error">
          <div className="wa-error-icon">⚠️</div>
          <h2>Connection Error</h2>
          <p>{error}</p>
          <p className="wa-hint">Make sure server is running on http://localhost:3000</p>
          <button onClick={fetchData} className="wa-btn-retry">Retry</button>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const incoming = data?.incoming || [];
  const outgoing = data?.outgoing || [];
  const statuses = data?.statuses || [];
  const users = data?.users || [];
  const events = data?.events || [];

  return (
    <div className="wa-dashboard">
      <header className="wa-header">
        <div className="wa-header-content">
          <div className="wa-logo">
            <span className="wa-icon">💬</span>
            <h1>WhatsApp Bot Dashboard</h1>
          </div>
          <div className="wa-status">
            <span className="wa-status-dot"></span>
            <span>Live</span>
          </div>
        </div>
        <p className="wa-fetch-url">📡 {API_URL}</p>
      </header>

      <div className="wa-stats-container">
        <div className="wa-stat-card wa-gradient-1">
          <div className="wa-stat-icon">📊</div>
          <div className="wa-stat-value">{stats.totalEvents || 0}</div>
          <div className="wa-stat-label">Total Events</div>
        </div>
        <div className="wa-stat-card wa-gradient-2">
          <div className="wa-stat-icon">📥</div>
          <div className="wa-stat-value">{stats.incomingCount || 0}</div>
          <div className="wa-stat-label">Received</div>
        </div>
        <div className="wa-stat-card wa-gradient-3">
          <div className="wa-stat-icon">📤</div>
          <div className="wa-stat-value">{stats.outgoingCount || 0}</div>
          <div className="wa-stat-label">Sent</div>
        </div>
        <div className="wa-stat-card wa-gradient-4">
          <div className="wa-stat-icon">👥</div>
          <div className="wa-stat-value">{stats.uniqueUsers || 0}</div>
          <div className="wa-stat-label">Users</div>
        </div>
        <div className="wa-stat-card wa-gradient-5">
          <div className="wa-stat-icon">✅</div>
          <div className="wa-stat-value">{stats.sentStatus || 0}</div>
          <div className="wa-stat-label">Sent</div>
        </div>
        <div className="wa-stat-card wa-gradient-6">
          <div className="wa-stat-icon">📬</div>
          <div className="wa-stat-value">{stats.deliveredStatus || 0}</div>
          <div className="wa-stat-label">Delivered</div>
        </div>
        <div className="wa-stat-card wa-gradient-7">
          <div className="wa-stat-icon">👁️</div>
          <div className="wa-stat-value">{stats.readStatus || 0}</div>
          <div className="wa-stat-label">Read</div>
        </div>
        <div className="wa-stat-card wa-gradient-8">
          <div className="wa-stat-icon">💬</div>
          <div className="wa-stat-value">{stats.totalMessages || 0}</div>
          <div className="wa-stat-label">Messages</div>
        </div>
      </div>

      <div className="wa-content-grid">
        <div className="wa-card">
          <div className="wa-card-header wa-card-incoming">
            <span>📥 Incoming Messages</span>
            <span className="wa-badge">{incoming.length}</span>
          </div>
          <div className="wa-card-body">
            {incoming.length === 0 ? (
              <div className="wa-empty">
                <span>📭</span>
                <p>No messages yet</p>
              </div>
            ) : (
              incoming.slice(0, 8).map((e, i) => (
                <div key={i} className="wa-message wa-message-in">
                  <div className="wa-msg-avatar">{e.name?.charAt(0) || 'U'}</div>
                  <div className="wa-msg-content">
                    <div className="wa-msg-header">
                      <span className="wa-msg-name">{e.name}</span>
                      <span className="wa-msg-time">{e.displayTime}</span>
                    </div>
                    <p className="wa-msg-text">{e.body || e.msgType || 'No message'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="wa-card">
          <div className="wa-card-header wa-card-outgoing">
            <span>📤 Outgoing Messages</span>
            <span className="wa-badge">{outgoing.length}</span>
          </div>
          <div className="wa-card-body">
            {outgoing.length === 0 ? (
              <div className="wa-empty">
                <span>📤</span>
                <p>No messages sent</p>
              </div>
            ) : (
              outgoing.slice(0, 8).map((e, i) => (
                <div key={i} className="wa-message wa-message-out">
                  <div className="wa-msg-content">
                    <div className="wa-msg-header">
                      <span className="wa-msg-name">To: {e.from}</span>
                      <span className="wa-msg-time">{e.displayTime}</span>
                    </div>
                    <p className="wa-msg-text">{e.body || e.msgType || 'No message'}</p>
                  </div>
                  <div className="wa-msg-avatar wa-avatar-out">✓</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="wa-card">
          <div className="wa-card-header wa-card-status">
            <span>📊 Message Status</span>
            <span className="wa-badge">{statuses.length}</span>
          </div>
          <div className="wa-card-body">
            {statuses.length === 0 ? (
              <div className="wa-empty">
                <span>📊</span>
                <p>No status updates</p>
              </div>
            ) : (
              statuses.slice(0, 8).map((e, i) => (
                <div key={i} className="wa-status-item">
                  <span className={`wa-status-badge wa-status-${e.status}`}>
                    {e.status === 'read' ? '����️ Read' : e.status === 'delivered' ? '📬 Delivered' : '✅ Sent'}
                  </span>
                  <span className="wa-msg-time">{e.displayTime}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="wa-card">
          <div className="wa-card-header wa-card-users">
            <span>👥 Active Users</span>
            <span className="wa-badge">{users.length}</span>
          </div>
          <div className="wa-card-body">
            {users.length === 0 ? (
              <div className="wa-empty">
                <span>👤</span>
                <p>No active users</p>
              </div>
            ) : (
              users.slice(0, 8).map((u, i) => (
                <div key={i} className="wa-user-item">
                  <div className="wa-user-avatar">{u.name?.charAt(0) || 'U'}</div>
                  <div className="wa-user-info">
                    <span className="wa-user-name">{u.name || 'Unknown'}</span>
                    <span className="wa-user-id">{u.wa_id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="wa-card wa-card-full">
        <div className="wa-card-header wa-card-events">
          <span>📋 All Events</span>
          <span className="wa-badge">{events.length}</span>
        </div>
        <div className="wa-card-body wa-events-body">
          {events.length === 0 ? (
            <div className="wa-empty">
              <span>📋</span>
              <p>No events recorded</p>
            </div>
          ) : (
            <div className="wa-timeline">
              {events.slice(0, 15).map((e, i) => (
                <div key={i} className={`wa-timeline-item ${e.direction}`}>
                  <div className="wa-timeline-dot">
                    {e.type === 'status' ? '📊' : e.direction === 'incoming' ? '📥' : '📤'}
                  </div>
                  <div className="wa-timeline-content">
                    <span className="wa-timeline-title">
                      {e.type === 'status' ? `Status: ${e.status}` : e.direction === 'incoming' ? e.name : `To: ${e.from}`}
                    </span>
                    <span className="wa-timeline-time">{e.displayTime}</span>
                    {(e.body || e.msgType) && <p className="wa-timeline-text">{e.body || e.msgType}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="wa-footer">
        <p>Last updated: {new Date(data?.timestamp || new Date()).toLocaleString()}</p>
        <p>Auto-refreshes every 5 seconds</p>
      </footer>
    </div>
  );
}

export default WhatsAppDashboard;