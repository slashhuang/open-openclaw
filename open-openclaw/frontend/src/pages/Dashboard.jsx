import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Typography,
  Table,
  Progress,
  theme,
} from 'antd';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { healthApi, sessionsApi, logsApi, metricsApi, statusApi } from '../api';

function formatTokenShort(n) {
  if (n == null || typeof n !== 'number') return '?';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatTimeAgo(ms, intl) {
  if (ms == null || typeof ms !== 'number') return '';
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  if (min < 1) return intl.locale === 'zh-CN' ? '刚刚' : 'just now';
  if (min < 60) return intl.locale === 'zh-CN' ? `${min} 分钟前` : `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return intl.locale === 'zh-CN' ? `${h} 小时前` : `${h}h ago`;
  return intl.locale === 'zh-CN' ? `${Math.floor(h / 24)} 天前` : `${Math.floor(h / 24)}d ago`;
}

function inferSessionTypeLabel(sessionKey) {
  const key = sessionKey || '';
  const full = key.includes('/') ? key.split('/').pop() || key : key;
  if (full.endsWith(':main') || full === 'main') return 'heartbeat';
  if (full.includes(':cron:')) return 'cron';
  if (full.includes(':wave:')) return 'Wave';
  return 'user';
}

function tokenUsageRowDisplay(item, sessions) {
  const session =
    (item.sessionId && sessions.find((s) => s.sessionId === item.sessionId)) ||
    sessions.find((s) => s.sessionKey === item.sessionKey);
  const detailId = item.sessionId || session?.sessionId;
  const typeLabel = session?.typeLabel || inferSessionTypeLabel(item.sessionKey);
  const sys = typeLabel === 'heartbeat' || typeLabel === 'cron';
  const userLabel = session
    ? sys
      ? typeLabel
      : session.user || 'unknown'
    : detailId
      ? String(detailId).slice(0, 8) + '…'
      : (item.sessionKey || '').length > 28
        ? `${(item.sessionKey || '').slice(0, 28)}…`
        : item.sessionKey || '—';
  return { typeLabel, userLabel, detailId, sessionKeyFull: item.sessionKey };
}

function formatElevated(level) {
  if (level == null || level === '' || level === 'off') return null;
  if (level === 'on') return 'elevated';
  return `elevated:${level}`;
}

function resolveSessionDetailPath(mainSession) {
  if (!mainSession?.sessionId) return null;
  const sid = String(mainSession.sessionId);
  if (sid.includes('/')) return sid;
  const agentId = mainSession.agentId || (mainSession.key && String(mainSession.key).split(':')[1]) || 'main';
  return `${agentId}/${sid}`;
}

function GatewayStatusCard({ overview, intl }) {
  const { token } = theme.useToken();
  if (overview == null) {
    return (
      <Card title={intl.formatMessage({ id: 'dashboard.gatewayStatus' })} size="small">
        <Spin />
      </Card>
    );
  }
  if (overview.error) {
    const msg = typeof overview.error === 'string' ? overview.error : 'Error';
    return (
      <Card title={intl.formatMessage({ id: 'dashboard.gatewayStatus' })} size="small">
        <Typography.Text type="danger">{msg}</Typography.Text>
      </Card>
    );
  }
  const status = overview.status || {};
  const sessionsBlock = status.sessions || {};
  const defaults = sessionsBlock.defaults || {};
  const recent = sessionsBlock.recent || [];
  const mainSession = recent[0];
  const queuedEvents = Array.isArray(status.queuedSystemEvents) ? status.queuedSystemEvents : [];
  const connectVer = overview.version || '';
  const runtimeVer = status.runtimeVersion;
  let versionLine = '🦞 ';
  if (connectVer && runtimeVer && String(connectVer) !== String(runtimeVer)) {
    versionLine += `${connectVer} (${runtimeVer})`;
  } else {
    versionLine += connectVer || runtimeVer || '?';
  }
  const model = mainSession?.model || defaults.model || '?';
  const totalTok = mainSession?.totalTokens ?? 0;
  const ctxTok = mainSession?.contextTokens ?? defaults.contextTokens ?? null;
  const pct =
    mainSession?.percentUsed != null
      ? mainSession.percentUsed
      : ctxTok && ctxTok > 0
        ? Math.min(999, Math.round((totalTok / ctxTok) * 100))
        : null;
  const contextLine =
    ctxTok != null
      ? `${formatTokenShort(totalTok)}/${formatTokenShort(ctxTok)}${pct != null ? ` (${pct}%)` : ''}`
      : 'N/A';
  const sessionKey = mainSession?.key || '—';
  const detailPath = resolveSessionDetailPath(mainSession);
  const updatedPhrase =
    mainSession?.age != null
      ? formatTimeAgo(mainSession.age, intl)
      : mainSession?.updatedAt
        ? formatTimeAgo(Date.now() - mainSession.updatedAt, intl)
        : '—';
  const runtimeKind = mainSession?.kind === 'group' ? 'group' : 'direct';
  const think = mainSession?.thinkingLevel ?? 'off';
  const elevated = formatElevated(mainSession?.elevatedLevel);
  const runtimeParts = [`Runtime: ${runtimeKind}`, `Think: ${think}`, mainSession?.fastMode ? 'Fast: on' : null, elevated].filter(Boolean);
  const queueDepth = queuedEvents.length;

  return (
    <Card title={intl.formatMessage({ id: 'dashboard.gatewayStatus' })} size="small">
      <Typography.Paragraph style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 8, color: token.colorTextSecondary }}>
        {versionLine}
        <br />
        Model: {model}
        <br />
        Context: {contextLine} · Compactions: {mainSession?.compactionCount ?? 0}
        <br />
        Session:{' '}
        {detailPath ? (
          <Link to={`/sessions/${encodeURIComponent(detailPath)}`}>{sessionKey}</Link>
        ) : (
          sessionKey
        )}{' '}
        · {updatedPhrase}
        <br />
        {runtimeParts.join(' · ')}
        <br />
        Queue depth: {queueDepth}
      </Typography.Paragraph>
    </Card>
  );
}

export default function Dashboard() {
  const intl = useIntl();
  const { token } = theme.useToken();
  const [health, setHealth] = useState(null);
  const [statusOverview, setStatusOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [metrics, setMetrics] = useState({
    latency: null,
    tools: [],
    tokenSummary: null,
    tokenUsage: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [healthData, statusData, sessionsData, logsData, latencyData, toolsData, tokenSummaryData, tokenUsageData] =
        await Promise.all([
          healthApi.getHealth().catch(() => null),
          statusApi.getOverview().catch((e) => ({ error: e?.message || 'fail' })),
          sessionsApi.list().catch(() => []),
          logsApi.getRecent(10).catch(() => []),
          metricsApi.getLatency().catch(() => ({ p50: 0, p95: 0, p99: 0, count: 0 })),
          metricsApi.getTools().catch(() => []),
          metricsApi.getTokenSummary().catch(() => ({
            totalInput: 0,
            totalOutput: 0,
            totalTokens: 0,
            nearLimitCount: 0,
            limitReachedCount: 0,
            sessionCount: 0,
          })),
          metricsApi.getTokenUsage().catch(() => []),
        ]);
      setHealth(healthData);
      setStatusOverview(statusData);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setRecentLogs(Array.isArray(logsData) ? logsData : []);
      setMetrics({
        latency: latencyData || { p50: 0, p95: 0, p99: 0, count: 0 },
        tools: Array.isArray(toolsData) ? toolsData : [],
        tokenSummary: tokenSummaryData || {},
        tokenUsage: Array.isArray(tokenUsageData) ? tokenUsageData : [],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 3000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.status === 'active').length;
  const idleSessions = sessions.filter((s) => s.status === 'idle').length;
  const completedSessions = sessions.filter((s) => s.status === 'completed').length;
  const totalSessions = sessions.length;
  const sessionDistribution = [
    { name: intl.formatMessage({ id: 'dashboard.active' }), value: activeSessions, color: token.colorSuccess },
    { name: intl.formatMessage({ id: 'dashboard.idle' }), value: idleSessions, color: token.colorWarning },
    { name: intl.formatMessage({ id: 'dashboard.completed' }), value: completedSessions, color: token.colorPrimary },
  ].filter((i) => i.value > 0);

  const toolChartData = (metrics.tools || []).slice(0, 8).map((t) => ({
    name: t.tool?.length > 15 ? `${t.tool.slice(0, 15)}…` : t.tool,
    count: t.count,
  }));

  const tokenCols = [
    { title: '#', width: 48, render: (_, __, i) => i + 1 },
    { title: 'Type', dataIndex: 'sessionKey', width: 100, render: (_, row) => tokenUsageRowDisplay(row, sessions).typeLabel },
    {
      title: 'User',
      render: (_, row) => {
        const { userLabel, detailId, sessionKeyFull } = tokenUsageRowDisplay(row, sessions);
        return detailId ? (
          <Link to={`/sessions/${encodeURIComponent(detailId)}`} title={sessionKeyFull}>
            {userLabel}
          </Link>
        ) : (
          userLabel
        );
      },
    },
    { title: 'Total', dataIndex: 'totalTokens', render: (v) => v?.toLocaleString() },
    { title: 'In', dataIndex: 'inputTokens', render: (v) => v?.toLocaleString() },
    { title: 'Out', dataIndex: 'outputTokens', render: (v) => v?.toLocaleString() },
    {
      title: '%',
      render: (_, row) =>
        row.avgUtilization != null ? (
          <Progress percent={Math.round(row.avgUtilization)} size="small" status={row.avgUtilization > 80 ? 'exception' : 'normal'} />
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>{intl.formatMessage({ id: 'dashboard.title' })}</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title={intl.formatMessage({ id: 'dashboard.systemStatus' })} value={health?.status || '—'} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title={intl.formatMessage({ id: 'dashboard.totalSessions' })} value={totalSessions} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title={intl.formatMessage({ id: 'dashboard.active' })} value={activeSessions} valueStyle={{ color: token.colorSuccess }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card>
            <Statistic title={intl.formatMessage({ id: 'dashboard.idle' })} value={idleSessions} valueStyle={{ color: token.colorWarning }} />
          </Card>
        </Col>
      </Row>

      <GatewayStatusCard overview={statusOverview} intl={intl} />

      {metrics.latency?.count > 0 && (
        <Card title={intl.formatMessage({ id: 'dashboard.latency' })} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={6}><Statistic title="P50" suffix="ms" value={metrics.latency.p50} /></Col>
            <Col span={6}><Statistic title="P95" suffix="ms" value={metrics.latency.p95} /></Col>
            <Col span={6}><Statistic title="P99" suffix="ms" value={metrics.latency.p99} /></Col>
            <Col span={6}><Statistic title="Count" value={metrics.latency.count} /></Col>
          </Row>
        </Card>
      )}

      {metrics.tokenSummary && (
        <Card title={intl.formatMessage({ id: 'dashboard.tokenSummary' })} style={{ marginTop: 16 }}>
          <Row gutter={[8, 8]}>
            <Col xs={8}><Statistic title="Input" value={metrics.tokenSummary.totalInput} /></Col>
            <Col xs={8}><Statistic title="Output" value={metrics.tokenSummary.totalOutput} /></Col>
            <Col xs={8}><Statistic title="Total" value={metrics.tokenSummary.totalTokens} /></Col>
          </Row>
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={intl.formatMessage({ id: 'dashboard.sessionPie' })}>
            {sessionDistribution.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sessionDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>
                    {sessionDistribution.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography.Text type="secondary">—</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={intl.formatMessage({ id: 'dashboard.toolsTop' })}>
            {toolChartData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={toolChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: token.colorTextSecondary }} />
                  <YAxis tick={{ fill: token.colorTextSecondary }} />
                  <Tooltip contentStyle={{ background: token.colorBgElevated, border: `1px solid ${token.colorBorder}` }} />
                  <Bar dataKey="count" fill={token.colorPrimary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography.Text type="secondary">—</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      {metrics.tokenUsage?.length > 0 && (
        <Card title={intl.formatMessage({ id: 'dashboard.tokenTop' })} style={{ marginTop: 16 }}>
          <Table rowKey="sessionKey" size="small" pagination={false} dataSource={metrics.tokenUsage.slice(0, 10)} columns={tokenCols} scroll={{ x: true }} />
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            title={intl.formatMessage({ id: 'dashboard.recentSessions' })}
            extra={<Link to="/sessions">{intl.formatMessage({ id: 'dashboard.viewAll' })}</Link>}
          >
            <Table
              size="small"
              pagination={false}
              dataSource={sessions.slice(0, 5)}
              rowKey="sessionId"
              columns={[
                { title: 'Type', render: (_, r) => r.typeLabel || inferSessionTypeLabel(r.sessionKey) },
                {
                  title: 'ID',
                  render: (_, r) => <Link to={`/sessions/${r.sessionId}`}>{String(r.sessionId).slice(0, 10)}…</Link>,
                },
                {
                  title: 'User',
                  render: (_, r) =>
                    r.typeLabel === 'heartbeat' || r.typeLabel === 'cron' ? r.typeLabel : r.user || '—',
                },
                { title: 'Status', dataIndex: 'status' },
                {
                  title: 'Last',
                  render: (_, r) => new Date(r.lastActive).toLocaleString(intl.locale),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={intl.formatMessage({ id: 'dashboard.health' })}>
            <p>Gateway: {health?.openclawConnected ? '✓' : '✗'}</p>
            <p>Memory: {health?.gateway?.memory ? `${Math.round(health.gateway.memory / 1024 / 1024)} MB` : '—'}</p>
            <p>CPU: {health?.gateway?.cpu != null ? `${health.gateway.cpu}%` : '—'}</p>
          </Card>
        </Col>
      </Row>

      <Card
        title={intl.formatMessage({ id: 'dashboard.recentLogs' })}
        style={{ marginTop: 16 }}
        extra={<Link to="/logs">{intl.formatMessage({ id: 'dashboard.fullLogs' })}</Link>}
      >
        <div style={{ maxHeight: 280, overflow: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
          {recentLogs.map((log, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <Typography.Text type="secondary">{new Date(log.timestamp).toLocaleTimeString(intl.locale)}</Typography.Text>{' '}
              <Typography.Text type={log.level === 'error' ? 'danger' : undefined}>[{log.level}]</Typography.Text>{' '}
              {log.content}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
