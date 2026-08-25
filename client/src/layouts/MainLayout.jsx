import { useState } from 'react';
import { Layout, Menu, theme as antdTheme, Dropdown, Avatar } from 'antd';
import {
  HomeOutlined, TeamOutlined, ShareAltOutlined,
  ImportOutlined, SettingOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  UserOutlined, LogoutOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import OfflineStatus from '../components/OfflineStatus';

const { Sider, Header, Content } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <HomeOutlined />, label: '首页' },
  { key: '/persons', icon: <TeamOutlined />, label: '人脉档案' },
  { key: '/graph', icon: <ShareAltOutlined />, label: '关系图谱' },
  { key: '/import', icon: <ImportOutlined />, label: '数据导入' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' }
];

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { token: { colorBgContainer } } = antdTheme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{ background: colorBgContainer, borderRight: '1px solid #f0f0f0' }}
        width={220}
      >
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#5B6CFF' }}>人脉知识库</div>
          {!collapsed && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>V1.0.0</div>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: colorBgContainer, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {collapsed ? <MenuUnfoldOutlined onClick={() => setCollapsed(false)} style={{ fontSize: 18 }} /> : <MenuFoldOutlined onClick={() => setCollapsed(true)} style={{ fontSize: 18 }} />}
            <span style={{ color: '#666', fontSize: 13 }}>人脉知识库</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <OfflineStatus />
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', icon: <UserOutlined />, label: user?.username || '用户' },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); navigate('/login'); } }
                ]
              }}
              placement="bottomRight"
            >
              <Avatar style={{ backgroundColor: '#5B6CFF', cursor: 'pointer' }}>
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 0, padding: 0 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
