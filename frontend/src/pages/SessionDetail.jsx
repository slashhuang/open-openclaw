import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Tabs,
  Button,
  Space,
  Typography,
  Spin,
  Tag,
  Progress,
  Descriptions,
  Collapse,
  theme,
  message,
  Modal,
} from 'antd';
import { useIntl } from 'react-intl';
import { sessionsApi } from '../api';

function inferMessageLabel(msg) {
  if (msg.role !== 'user') return msg.role;
  const content = (msg.content || '').toLowerCase();
  if (content.includes('heartbeat.md') || content.includes('heartbeat_ok') || content.includes('heartbeat poll')) {
    return 'heartbeat';
  }
  if (content.includes('current time:') && content.length > 150) return 'heartbeat';
  if (content.includes('cron:') || content.includes('scheduled task')) return 'cron';
  return 'user';
}

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const intl = useIntl();
  const { token } = theme.useToken();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('messages');

  const fetchSession = async () => {
    try {
      const data = await sessionsApi.getDetail(id);
      setSession(data);
      setError(null);
    } catch (e) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  const onKill = () => {
    Modal.confirm({
      title: intl.formatMessage({ id: 'confirm.killSession' }),
      onOk: async () => {
        try {
          await sessionsApi.kill(id);
          navigate('/sessions');
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

  if (loading) {
    return <Spin style={{ display: 'block', margin: 48 }} />;
  }
  if (error) {
    return (
      <Card>
        <Typography.Title type="danger" level={4}>{intl.formatMessage({ id: 'session.loadError' })}</Typography.Title>
        <Typography.Paragraph>{error}</Typography.Paragraph>
        <Space>
          <Button type="primary" onClick={fetchSession}>{intl.formatMessage({ id: 'common.retry' })}</Button>
          <Button onClick={() => navigate('/sessions')}>{intl.formatMessage({ id: 'common.back' })}</Button>
        </Space>
      </Card>
    );
  }
  if (!session) {
    return (
      <Card>
        <Typography.Title level={4}>{intl.formatMessage({ id: 'session.notFound' })}</Typography.Title>
        <Button type="primary" onClick={() => navigate('/sessions')}>{intl.formatMessage({ id: 'common.back' })}</Button>
      </Card>
    );
  }

  const usage = session.tokenUsage;
  const limit = usage?.limit ?? session.contextTokens;
  const utilPct = limit && usage?.total != null ? Math.min(100, Math.round((usage.total / limit) * 100)) : null;

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>{intl.formatMessage({ id: 'session.detail' })}</Typography.Title>
        {session.typeLabel && <Tag>{session.typeLabel}</Tag>}
        <Typography.Text type="secondary" copyable>{session.sessionId}</Typography.Text>
        <Link to="/sessions"><Button>{intl.formatMessage({ id: 'common.back' })}</Button></Link>
        {session.status === 'active' && (
          <Button danger onClick={onKill}>{intl.formatMessage({ id: 'common.kill' })}</Button>
        )}
      </Space>

      <RowCards session={session} formatDuration={formatDuration} />

      {usage && limit != null && (
        <Card size="small" title="Token" style={{ marginBottom: 16 }}>
          <Progress percent={utilPct || 0} status={utilPct > 80 ? 'exception' : 'active'} />
          <Typography.Text type="secondary">
            {usage.total} / {limit} ({utilPct}%)
          </Typography.Text>
        </Card>
      )}

      <Card>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'messages',
              label: `${intl.formatMessage({ id: 'session.messages' })} (${session.messages?.length || 0})`,
              children: (
                <div style={{ maxHeight: 520, overflow: 'auto' }}>
                  {(session.messages || []).map((msg, idx) => {
                    const role = inferMessageLabel(msg);
                    const sys = role === 'heartbeat' || role === 'cron';
                    return (
                      <Card
                        key={idx}
                        size="small"
                        style={{
                          marginBottom: 8,
                          background: sys ? token.colorWarningBg : msg.role === 'user' ? token.colorPrimaryBg : token.colorSuccessBg,
                        }}
                      >
                        <Space>
                          <Tag>{role}</Tag>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleString(intl.locale) : '—'}
                          </Typography.Text>
                        </Space>
                        <Typography.Paragraph style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {msg.content || '(empty)'}
                        </Typography.Paragraph>
                      </Card>
                    );
                  })}
                  {(!session.messages || !session.messages.length) && (
                    <Typography.Text type="secondary">—</Typography.Text>
                  )}
                </div>
              ),
            },
            {
              key: 'toolCalls',
              label: `${intl.formatMessage({ id: 'session.tools' })} (${session.toolCalls?.length || 0})`,
              children: (
                <div style={{ maxHeight: 520, overflow: 'auto' }}>
                  {(session.toolCalls || []).map((tool, idx) => (
                    <Card
                      key={idx}
                      size="small"
                      style={{ marginBottom: 8, borderColor: tool.success ? token.colorSuccess : token.colorError }}
                    >
                      <Tag>{tool.name || tool.tool}</Tag>
                      <Tag color={tool.success ? 'success' : 'error'}>{tool.success ? 'OK' : 'Fail'}</Tag>
                      <Typography.Text type="secondary">{tool.duration || tool.durationMs}ms</Typography.Text>
                      {tool.error && <Typography.Paragraph type="danger">{tool.error}</Typography.Paragraph>}
                      {(tool.input || tool.output) && (
                        <Collapse
                          size="small"
                          items={[
                            tool.input && {
                              key: 'in',
                              label: 'Input',
                              children: <pre style={{ fontSize: 11, overflow: 'auto' }}>{JSON.stringify(tool.input, null, 2)}</pre>,
                            },
                            tool.output && {
                              key: 'out',
                              label: 'Output',
                              children: <pre style={{ fontSize: 11, overflow: 'auto' }}>{JSON.stringify(tool.output, null, 2)}</pre>,
                            },
                          ].filter(Boolean)}
                        />
                      )}
                    </Card>
                  ))}
                </div>
              ),
            },
            {
              key: 'events',
              label: `${intl.formatMessage({ id: 'session.events' })} (${session.events?.length || 0})`,
              children: (
                <div style={{ maxHeight: 520, overflow: 'auto' }}>
                  {(session.events || []).map((ev, idx) => (
                    <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                      <Tag>{ev.type || 'event'}</Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {ev.timestamp ? new Date(ev.timestamp).toLocaleString(intl.locale) : '—'}
                      </Typography.Text>
                      <pre style={{ fontSize: 12, marginTop: 8 }}>{JSON.stringify(ev.payload || ev, null, 2)}</pre>
                    </Card>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

function RowCards({ session, formatDuration }) {
  return (
    <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 4 }} style={{ marginBottom: 16 }}>
      <Descriptions.Item label="Status">{session.status}</Descriptions.Item>
      <Descriptions.Item label="User">
        {session.typeLabel === 'heartbeat' || session.typeLabel === 'cron' ? session.typeLabel : session.user || '—'}
      </Descriptions.Item>
      <Descriptions.Item label="Messages">{session.messages?.length ?? 0}</Descriptions.Item>
      <Descriptions.Item label="Tools">{session.toolCalls?.length ?? 0}</Descriptions.Item>
      <Descriptions.Item label="Duration">{formatDuration(session.duration)}</Descriptions.Item>
    </Descriptions>
  );
}
