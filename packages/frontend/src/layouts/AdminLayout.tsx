import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Alert } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  UploadOutlined,
  LogoutOutlined,
  UserOutlined,
  KeyOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useAdminStore } from '../stores/adminStore';
import { adminService } from '../services/adminService';

const { Header, Sider, Content } = Layout;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mfaNeeded, setMfaNeeded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { username, logout } = useAdminStore();
  const { token: themeToken } = theme.useToken();

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    try {
      const res = await adminService.getMfaStatus();
      if (!res.enabled) {
        setMfaNeeded(true);
      }
    } catch (err) {
      console.error('检查 MFA 状态失败');
    }
  };

  const menuItems = [
    {
      key: '/admin/games',
      icon: <AppstoreOutlined />,
      label: '游戏管理',
    },
    {
      key: '/admin/games/new',
      icon: <UploadOutlined />,
      label: '上传游戏',
    },
    {
      key: '/admin/invite-codes',
      icon: <KeyOutlined />,
      label: '邀请码管理',
    },
    {
      key: '/admin/users',
      icon: <TeamOutlined />,
      label: '用户列表',
    },
    {
      key: '/admin/mfa',
      icon: <SafetyCertificateOutlined />,
      label: '安全设置',
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 16 : 20,
            fontWeight: 'bold',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {collapsed ? '🎮' : '🎮 游戏管理'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: themeToken.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 64, height: 64 }}
            />
            {mfaNeeded && location.pathname !== '/admin/mfa' && (
              <Alert
                message="安全提醒：您尚未开启 MFA 二步验证，建议立即配置以保障账户安全。"
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                action={
                  <Button size="small" type="primary" onClick={() => navigate('/admin/mfa')}>
                    立即配置
                  </Button>
                }
                style={{ marginLeft: 24, padding: '4px 15px' }}
              />
            )}
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{username}</span>
            </div>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: themeToken.colorBgContainer,
            borderRadius: themeToken.borderRadiusLG,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
