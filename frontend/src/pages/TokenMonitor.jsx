import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Spin,
  Switch,
  Button,
  Table,
  theme,
} from 'antd';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useIntl } from 'react-intl';

const THRESHOLD_COLORS = {
  normal: '#52c41a',
  warning: '#faad14',
  serious: '#fa8c16',
  critical: '#ff4d4f',
  limit: '#cf1322',
};

function inferSessionTypeLabel(sessionKey) {
  const key = sessionKey || '';
  const full = key.includes('/') ? key.split('/').pop() || key : key;
  if (full.endsWith(':main') || full === 'main') return 'heartbeat';
  if (full.includes(':cron:')) return 'cron';
  return 'user';
}

function userLabelForTokenRow(usageRow, sessionList) {
  const ls = sessionList.find((s) => s.sessionKey === usageRow.sessionKey);
  const typeLabel = ls?.typeLabel || inferSessionTypeLabel(usageRow.sessionKey);
  const sys = typeLabel === 'heartbeat' || typeLabel === 'cron';
  if (ls) return sys ? typeLabel : ls.user || 'unknown';
  const id = usageRow.sessionId || '';
  const tail = id.includes('/') ? id.split('/').pop() : id;
  return tail && tail.length >= 6 ? `${tail.slice(0, 8)}…` : usageRow.sessionKey?.slice(0, 14) || '—';
}

export default function TokenMonitor() {
  const intl = useIntl();
  const { token } = theme.useToken();
  const [sessions, setSessions] = useState([]);
  const [sessionList, setSessionList] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const [a, b, c] = await Promise.all([
        fetch('/api/sessions/token-usage'),
        fetch('/api/sessions/token-alerts/history'),
        fetch('/api/sessions'),
      ]);
      setSessions(await a.json());
      setAlerts(await b.json());
      const list = await c.json();
      setSessionList(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  const thresholdDistribution = [
    { name: 'normal', value: sessions.filter((s) => s.threshold === 'normal').length, color: THRESHOLD_COLORS.normal },
    { name: 'warning', value: sessions.filter((s) => s.threshold === 'warning').length, color: THRESHOLD_COLORS.warning },
    { name: 'serious', value: sessions.filter((s) => s.threshold === 'serious').length, color: THRESHOLD_COLORS.serious },
    { name: 'critical', value: sessions.filter((s) => s.threshold === 'critical').length, color: THRESHOLD_COLORS.critical },
    { name: 'limit', value: sessions.filter((s) => s.threshold === 'limit').length, color: THRESHOLD_COLORS.limit },
  ];

  const topConsumptionSessions = [...sessions]
    .sort((a, b) => b.consumptionRate - a.consumptionRate)
    .slice(0, 10)
    .map((s) => ({
      name: userLabelForTokenRow(s, sessionList).length > 14
        ? `${userLabelForTokenRow(s, sessionList).slice(0, 14)}…`
        : userLabelForTokenRow(s, sessionList),
      nameTip: s.sessionKey,
      rate: s.consumptionRate,
    }));

  const highUtil = sessions.filter((s) => s.utilization > 50);

  if (loading) {
    return <Spin style={{ display: 'block', margin: 48 }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>{intl.formatMessage({ id: 'token.title' })}</Typography.Title>
          <Typography.Text type="secondary">{intl.formatMessage({ id: 'token.subtitle' })}</Typography.Text>
        </div>
        <span>
          <Switch checked={autoRefresh} onChange={setAutoRefresh} /> {intl.formatMessage({ id: 'token.autoRefresh' })}{' '}
          <Button onClick={fetchData} style={{ marginLeft: 8 }}>{intl.formatMessage({ id: 'common.refresh' })}</Button>
        </span>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={8} sm={4}><Card size="small"><Statistic title="Total" value={sessions.length} /></Card></Col>
        <Col xs={8} sm={4}><Card size="small"><Statistic title="OK" value={thresholdDistribution[0].value} valueStyle={{ color: THRESHOLD_COLORS.normal }} /></Card></Col>
        <Col xs={8} sm={4}><Card size="small"><Statistic title="Warn" value={thresholdDistribution[1].value} valueStyle={{ color: THRESHOLD_COLORS.warning }} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Serious/Crit" value={thresholdDistribution[2].value + thresholdDistribution[3].value} valueStyle={{ color: THRESHOLD_COLORS.critical }} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Limit" value={thresholdDistribution[4].value} /></Card></Col>
      </Row>

      {alerts.length > 0 && (
        <Card title="Alerts" style={{ marginBottom: 16 }}>
          {alerts.slice(-5).reverse().map((a, i) => (
            <Typography.Paragraph key={i} style={{ marginBottom: 8 }}>
              <Typography.Text strong>{a.message}</Typography.Text>
              <br />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {new Date(a.timestamp).toLocaleString(intl.locale)}
              </Typography.Text>
            </Typography.Paragraph>
          ))}
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Threshold">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={thresholdDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                  {thresholdDistribution.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        {topConsumptionSessions.length > 0 && (
          <Col xs={24} lg={12}>
            <Card title="Top rate (tok/min)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topConsumptionSessions}>
                  <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: token.colorTextSecondary }} height={60} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fill: token.colorTextSecondary }} />
                  <Tooltip labelFormatter={(_, p) => p?.[0]?.payload?.nameTip || ''} contentStyle={{ background: token.colorBgElevated }} />
                  <Bar dataKey="rate" fill={token.colorPrimary} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        )}
      </Row>

      {highUtil.length > 0 && (
        <Card title="> 50% utilization">
          <Table
            rowKey={(r) => r.sessionId || r.sessionKey}
            size="small"
            scroll={{ x: true }}
            dataSource={highUtil}
            columns={[
              {
                title: 'Type',
                render: (_, r) => {
                  const tl = sessionList.find((s) => s.sessionKey === r.sessionKey)?.typeLabel || inferSessionTypeLabel(r.sessionKey);
                  return <Tag>{tl}</Tag>;
                },
              },
              {
                title: 'User',
                render: (_, r) => (
                  <Link to={`/sessions/${encodeURIComponent(r.sessionId)}`}>{userLabelForTokenRow(r, sessionList)}</Link>
                ),
              },
              {
                title: '%',
                dataIndex: 'utilization',
                render: (v, r) => (
                  <span style={{ color: THRESHOLD_COLORS[r.threshold] || undefined }}>{v}%</span>
                ),
              },
              { title: 'Used', dataIndex: 'totalTokens', render: (v) => v?.toLocaleString() },
              { title: 'Limit', dataIndex: 'limit', render: (v) => v?.toLocaleString() || '∞' },
              { title: 'Rate', dataIndex: 'consumptionRate', render: (v) => `${v}/min` },
            ]}
          />
        </Card>
      )}
    </div>
  );
}

function Tag({ children }) {
  return <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'var(--ant-color-fill-secondary)' }}>{children}</span>;
}
