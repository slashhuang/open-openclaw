import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { logsApi } from '../api';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [socketConnected, setSocketConnected] = useState(false);
  const logsEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // 加载初始日志
    const fetchLogs = async () => {
      try {
        const data = await logsApi.getRecent(200);
        setLogs(data);
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();

    // 连接 WebSocket
    socketRef.current = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      setSocketConnected(true);
      socketRef.current.emit('logs:subscribe');
    });

    socketRef.current.on('disconnect', () => {
      setSocketConnected(false);
    });

    socketRef.current.on('logs:new', (log) => {
      setLogs(prev => {
        const newLogs = [...prev, log];
        return newLogs.slice(-500); // 最多保留 500 条
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (filterLevel === 'all') return true;
    return log.level === filterLevel;
  });

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return '#f56565';
      case 'warn': return '#ed8936';
      case 'debug': return '#9f7aea';
      default: return '#48bb78';
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (loading) {
    return <div className="loading">加载日志...</div>;
  }

  return (
    <div>
      <div className="flex flex-between" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-title">实时日志</h2>
        <div className="flex">
          <span className={`text-sm ${socketConnected ? 'text-success' : 'text-danger'}`} style={{ marginRight: '1rem' }}>
            {socketConnected ? '● 实时连接中' : '○ 未连接'}
          </span>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="form-input"
            style={{ width: 'auto', marginRight: '0.5rem' }}
          >
            <option value="all">全部级别</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
          <button
            className="btn btn-secondary"
            onClick={() => setAutoScroll(!autoScroll)}
            style={{ marginRight: '0.5rem' }}
          >
            {autoScroll ? '暂停滚动' : '自动滚动'}
          </button>
          <button className="btn btn-danger" onClick={clearLogs}>清空日志</button>
        </div>
      </div>

      <div className="card">
        <div className="log-container" style={{ maxHeight: '70vh' }}>
          {filteredLogs.map((log, index) => (
            <div key={index} className="log-line">
              <span style={{ color: '#666', marginRight: '0.5rem' }}>
                {new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
              </span>
              <span
                style={{
                  color: getLevelColor(log.level),
                  marginRight: '0.5rem',
                  fontWeight: '600',
                  width: '50px',
                  display: 'inline-block',
                }}
              >
                [{log.level.toUpperCase()}]
              </span>
              <span style={{ color: '#e2e8f0' }}>{log.content}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
          {filteredLogs.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
              暂无日志
            </div>
          )}
        </div>
        <div className="text-muted text-sm mt-4">
          显示 {filteredLogs.length} 条日志 {logs.length !== filteredLogs.length && `(过滤前 ${logs.length} 条)`}
        </div>
      </div>
    </div>
  );
}
