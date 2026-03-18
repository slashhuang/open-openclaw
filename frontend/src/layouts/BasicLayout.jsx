import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-layout';
import {
  DashboardOutlined,
  MessageOutlined,
  ToolOutlined,
  FileTextOutlined,
  DollarOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { Alert, Select, Space, Tag } from 'antd';
import { useIntl } from 'react-intl';
import { useLocaleTheme } from '../providers/LocaleThemeProvider';
import { healthApi } from '../api';

export default function BasicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const intl = useIntl();
  const { locale, setLocale, themeMode, setThemeMode, isDark } = useLocaleTheme();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await healthApi.getHealth();
        setHealth(data);
      } catch {
        setHealth(null);
      }
    };
    fetchHealth();
    const t = setInterval(fetchHealth, 10000);
    return () => clearInterval(t);
  }, []);

  const gatewayDisconnected = health && !health.openclawConnected;
  const gatewayError = health?.gatewayError;

  const menuData = [
    { path: '/', key: '/', name: intl.formatMessage({ id: 'menu.dashboard' }), icon: <DashboardOutlined /> },
    { path: '/sessions', key: '/sessions', name: intl.formatMessage({ id: 'menu.sessions' }), icon: <MessageOutlined /> },
    { path: '/skills', key: '/skills', name: intl.formatMessage({ id: 'menu.skills' }), icon: <ToolOutlined /> },
    { path: '/system-prompt', key: '/system-prompt', name: intl.formatMessage({ id: 'menu.systemPrompt' }), icon: <FileTextOutlined /> },
    { path: '/tokens', key: '/tokens', name: intl.formatMessage({ id: 'menu.tokens' }), icon: <DollarOutlined /> },
    { path: '/logs', key: '/logs', name: intl.formatMessage({ id: 'menu.logs' }), icon: <UnorderedListOutlined /> },
    { path: '/settings', key: '/settings', name: intl.formatMessage({ id: 'menu.settings' }), icon: <SettingOutlined /> },
  ];

  return (
    <ProLayout
      title={intl.formatMessage({ id: 'app.title' })}
      logo={<span style={{ fontSize: 22 }}>🦞</span>}
      layout="mix"
      fixedHeader
      fixSiderbar
      navTheme={isDark ? 'realDark' : 'light'}
      location={{ pathname: location.pathname }}
      menuDataRender={() => menuData}
      menuItemRender={(item, dom) =>
        item.path && !String(item.path).includes(':') ? (
          <Link to={item.path}>{dom}</Link>
        ) : (
          dom
        )
      }
      actionsRender={() =>
        [
          health?.status && (
            <Tag key="st" color={health.status === 'ok' || health.status === 'healthy' ? 'success' : 'default'}>
              {String(health.status)}
            </Tag>
          ),
          <span key="gw" style={{ fontSize: 12, opacity: 0.85 }}>
            <ApiOutlined /> {health?.openclawConnected ? '●' : '○'} Gateway
          </span>,
          <Select
            key="lang"
            size="small"
            value={locale}
            onChange={setLocale}
            style={{ width: 108 }}
            options={[
              { value: 'zh-CN', label: intl.formatMessage({ id: 'lang.zh' }) },
              { value: 'en-US', label: intl.formatMessage({ id: 'lang.en' }) },
            ]}
          />,
          <Select
            key="theme"
            size="small"
            value={themeMode}
            onChange={setThemeMode}
            style={{ width: 108 }}
            options={[
              { value: 'light', label: intl.formatMessage({ id: 'theme.light' }) },
              { value: 'dark', label: intl.formatMessage({ id: 'theme.dark' }) },
              { value: 'system', label: intl.formatMessage({ id: 'theme.system' }) },
            ]}
          />,
        ].filter(Boolean)
      }
      onMenuHeaderClick={() => navigate('/')}
    >
      {gatewayDisconnected && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <Space wrap>
              <strong>{intl.formatMessage({ id: 'gateway.banner.title' })}</strong>
              {gatewayError && <span>{gatewayError}</span>}
              <a onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
                {intl.formatMessage({ id: 'gateway.banner.settings' })} →
              </a>
            </Space>
          }
        />
      )}
      <div style={{ padding: '0 24px 24px', minHeight: 360 }}>
        <Outlet />
      </div>
    </ProLayout>
  );
}
