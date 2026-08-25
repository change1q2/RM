import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';
import { useAuthStore } from '../store/auth';
import { syncEngine } from '../utils/sync';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null);
  const navigate = useNavigate();
  const { setAuth, setInitialized } = useAuthStore();

  useEffect(() => {
    request.get('/auth/status').then((data) => {
      setMode(data.initialized ? 'login' : 'init');
      setInitialized(data.initialized);
    }).catch(() => setMode('login'));
  }, []);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const endpoint = mode === 'init' ? '/auth/init' : '/auth/login';
      const data = await request.post(endpoint, values);
      setAuth(data.token, data.user);
      setInitialized(true);
      
      // 登录成功后初始化离线数据缓存
      try {
        if (navigator.onLine) {
          await syncEngine.pullLatestData();
          console.log('[Login] 离线数据缓存初始化完成');
        } else {
          console.log('[Login] 离线模式，跳过数据初始化');
        }
      } catch (syncErr) {
        console.warn('[Login] 离线数据缓存初始化失败（不影响登录）:', syncErr.message);
      }
      
      message.success(mode === 'init' ? '初始化成功' : '登录成功');
      navigate('/dashboard');
    } catch (e) {
      // error toast handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  if (!mode) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Typography.Title level={3} style={{ color: '#5B6CFF', marginBottom: 4 }}>人脉知识库</Typography.Title>
          <Typography.Text type="secondary">V1.0.0</Typography.Text>
        </div>
        <Form onFinish={handleSubmit} layout="vertical" size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {mode === 'init' ? '初始化管理员账号' : '登录'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
