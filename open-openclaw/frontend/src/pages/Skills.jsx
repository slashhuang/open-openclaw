import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tabs,
  Typography,
  Spin,
  Tag,
  Space,
  theme,
} from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useIntl } from 'react-intl';

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff7a45', '#722ed1', '#13c2c2'];

export default function Skills() {
  const intl = useIntl();
  const { token } = theme.useToken();
  const [skills, setSkills] = useState([]);
  const [systemPrompt, setSystemPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('list');

  useEffect(() => {
    (async () => {
      try {
        const [skillsRes, spRes] = await Promise.all([
          fetch('/api/skills/usage'),
          fetch('/api/skills/system-prompt/analysis'),
        ]);
        setSkills(await skillsRes.json());
        setSystemPrompt(await spRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const callFrequencyData = (skills || [])
    .filter((s) => s.callCount > 0)
    .sort((a, b) => b.callCount - a.callCount)
    .slice(0, 10)
    .map((s) => ({ name: s.name, count: s.callCount }));

  const tokenDistributionData = systemPrompt
    ? [
        { name: 'Active', value: systemPrompt.activeSkillsTokens || 0 },
        { name: 'Zombie', value: systemPrompt.zombieSkillsTokens || 0 },
        { name: 'Dup', value: systemPrompt.duplicateSkillsTokens || 0 },
      ]
    : [];

  const zombieSkills = (skills || []).filter(
    (s) => s.lastUsed && s.lastUsed < Date.now() - 30 * 24 * 60 * 60 * 1000,
  );
  const duplicateSkills = (skills || []).filter((s) => s.duplicateWith?.length > 0);

  if (loading) {
    return <Spin style={{ display: 'block', margin: 48 }} />;
  }

  return (
    <div>
      <Typography.Title level={4}>{intl.formatMessage({ id: 'skills.title' })}</Typography.Title>
      <Typography.Paragraph type="secondary">{intl.formatMessage({ id: 'skills.subtitle' })}</Typography.Paragraph>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'list',
            label: intl.formatMessage({ id: 'skills.tabList' }),
            children: (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col xs={12} sm={6}><Card><Statistic title="Total" value={skills.length} /></Card></Col>
                  <Col xs={12} sm={6}><Card><Statistic title="Enabled" value={skills.filter((s) => s.enabled).length} valueStyle={{ color: token.colorSuccess }} /></Card></Col>
                  <Col xs={12} sm={6}><Card><Statistic title="Zombie" value={zombieSkills.length} valueStyle={{ color: token.colorError }} /></Card></Col>
                  <Col xs={12} sm={6}><Card><Statistic title="Dup" value={duplicateSkills.length} valueStyle={{ color: token.colorWarning }} /></Card></Col>
                </Row>
                {callFrequencyData.length > 0 && (
                  <Card title="Top 10" style={{ marginBottom: 16 }}>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={callFrequencyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
                        <XAxis dataKey="name" tick={{ fill: token.colorTextSecondary, fontSize: 10 }} />
                        <YAxis tick={{ fill: token.colorTextSecondary }} />
                        <Tooltip contentStyle={{ background: token.colorBgElevated }} />
                        <Bar dataKey="count" fill={token.colorPrimary} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}
                <Card>
                  <Table
                    rowKey={(r) => r.name}
                    dataSource={skills}
                    scroll={{ x: true }}
                    columns={[
                      {
                        title: 'Name',
                        dataIndex: 'name',
                        render: (n, r) => (
                          <div>
                            <Typography.Text strong>{n}</Typography.Text>
                            <div><Typography.Text type="secondary" ellipsis style={{ maxWidth: 280 }}>{r.description}</Typography.Text></div>
                          </div>
                        ),
                      },
                      {
                        title: 'Status',
                        render: (_, r) => <Tag color={r.enabled ? 'green' : 'red'}>{r.enabled ? 'On' : 'Off'}</Tag>,
                      },
                      { title: 'Tokens', dataIndex: 'tokenCount' },
                      { title: 'Calls', dataIndex: 'callCount' },
                      {
                        title: 'Last',
                        dataIndex: 'lastUsed',
                        render: (t) => (t ? new Date(t).toLocaleDateString(intl.locale) : '—'),
                      },
                      {
                        title: 'Flags',
                        render: (_, r) => (
                          <Space>
                            {r.duplicateWith?.length > 0 && <Tag color="orange">Dup</Tag>}
                            {r.lastUsed && r.lastUsed < Date.now() - 30 * 24 * 60 * 60 * 1000 && <Tag color="red">Zombie</Tag>}
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Card>
              </>
            ),
          },
          {
            key: 'analysis',
            label: intl.formatMessage({ id: 'skills.tabAnalysis' }),
            children: systemPrompt ? (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Token split">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={tokenDistributionData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label>
                          {tokenDistributionData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Savings">
                    <Statistic title="Current" value={systemPrompt.totalTokens} />
                    <Statistic title="After" value={systemPrompt.totalTokens - systemPrompt.savings} valueStyle={{ color: token.colorSuccess }} />
                    <Typography.Paragraph>
                      Save {systemPrompt.savings} ({systemPrompt.savingsPercent}%)
                    </Typography.Paragraph>
                    <ul style={{ paddingLeft: 20 }}>
                      {(systemPrompt.recommendations || []).map((rec, i) => (
                        <li key={i}><Typography.Text>{rec}</Typography.Text></li>
                      ))}
                    </ul>
                  </Card>
                </Col>
              </Row>
            ) : (
              <Typography.Text type="secondary">—</Typography.Text>
            ),
          },
        ]}
      />
    </div>
  );
}
