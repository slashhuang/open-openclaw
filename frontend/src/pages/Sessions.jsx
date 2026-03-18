import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Table, Tag, Button, Space, Typography, Spin, Radio, message, Modal } from 'antd';
import { useIntl } from 'react-intl';
import { sessionsApi } from '../api';

export default function Sessions() {
  const intl = useIntl();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchSessions = async () => {
    try {
      const data = await sessionsApi.list();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      message.error(e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const filtered = useMemo(
    () => sessions.filter((s) => (filter === 'all' ? true : s.status === filter)),
    [sessions, filter],
  );

  const onKill = (sessionId) => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'confirm.killSession' }),
      onOk: async () => {
        try {
          await sessionsApi.kill(sessionId);
          message.success('OK');
          fetchSessions();
        } catch (e) {
          message.error(e?.message);
        }
      },
    });
  };

  const formatDuration = (ms) => {
    if (!ms) return '—';
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${sec % 60}s`;
    return `${sec}s`;
  };

  const columns = [
    {
      title: 'Session',
      key: 'sk',
      render: (_, r) => (
        <Link to={`/sessions/${encodeURIComponent(r.sessionId)}`}>
          {(r.sessionKey || String(r.sessionId)).length > 48
            ? `${(r.sessionKey || String(r.sessionId)).slice(0, 48)}…`
            : r.sessionKey || r.sessionId}
        </Link>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      sorter: (a, b) => String(a.status).localeCompare(String(b.status)),
      render: (s) => <Tag color={s === 'active' ? 'green' : s === 'failed' ? 'red' : 'default'}>{s}</Tag>,
    },
    {
      title: 'User',
      key: 'user',
      sorter: (a, b) => {
        const ua = a.typeLabel === 'heartbeat' || a.typeLabel === 'cron' ? a.typeLabel : a.user || '';
        const ub = b.typeLabel === 'heartbeat' || b.typeLabel === 'cron' ? b.typeLabel : b.user || '';
        return String(ua).localeCompare(String(ub));
      },
      render: (_, r) =>
        r.typeLabel === 'heartbeat' || r.typeLabel === 'cron' ? r.typeLabel : r.user || '—',
    },
    {
      title: 'Last active',
      dataIndex: 'lastActive',
      defaultSortOrder: 'descend',
      sorter: (a, b) => (a.lastActive || 0) - (b.lastActive || 0),
      render: (t) => new Date(t).toLocaleString(intl.locale),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      sorter: (a, b) => (a.duration || 0) - (b.duration || 0),
      render: formatDuration,
    },
    {
      title: 'Tokens',
      dataIndex: 'totalTokens',
      sorter: (a, b) => (a.totalTokens || 0) - (b.totalTokens || 0),
      render: (v) => (v != null ? v.toLocaleString() : '—'),
    },
    {
      title: 'Util %',
      key: 'util',
      sorter: (a, b) => {
        const pa = a.tokenUsage?.utilization ?? (a.tokenUsage?.limit ? (a.tokenUsage.total / a.tokenUsage.limit) * 100 : 0);
        const pb = b.tokenUsage?.utilization ?? (b.tokenUsage?.limit ? (b.tokenUsage.total / b.tokenUsage.limit) * 100 : 0);
        return pa - pb;
      },
      render: (_, r) => {
        const u = r.tokenUsage;
        if (!u?.limit) return '—';
        const pct = Math.round(u.utilization ?? (u.total / u.limit) * 100);
        return `${pct}%`;
      },
    },
    {
      title: intl.formatMessage({ id: 'common.detail' }),
      key: 'act',
      render: (_, r) => (
        <Space>
          <Link to={`/sessions/${encodeURIComponent(r.sessionId)}`}>
            <Button size="small">{intl.formatMessage({ id: 'common.detail' })}</Button>
          </Link>
          {r.status === 'active' && (
            <Button size="small" danger onClick={() => onKill(r.sessionId)}>
              {intl.formatMessage({ id: 'common.kill' })}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return <Spin style={{ display: 'block', margin: 48 }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{intl.formatMessage({ id: 'sessions.title' })}</Typography.Title>
        <Radio.Group value={filter} onChange={(e) => setFilter(e.target.value)} buttonStyle="solid">
          <Radio.Button value="all">{intl.formatMessage({ id: 'common.all' })}</Radio.Button>
          {['active', 'idle', 'completed', 'failed'].map((s) => (
            <Radio.Button key={s} value={s}>{s}</Radio.Button>
          ))}
        </Radio.Group>
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{intl.formatMessage({ id: 'sessions.sortHint' })}</Typography.Text>
      <Table
        style={{ marginTop: 8 }}
        rowKey="sessionId"
        dataSource={filtered}
        columns={columns}
        locale={{ emptyText: intl.formatMessage({ id: 'sessions.empty' }) }}
        scroll={{ x: true }}
      />
    </div>
  );
}
