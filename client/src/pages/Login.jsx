import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';
import { useAuthStore } from '../store/auth';
import { syncEngine } from '../utils/sync';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(null);  // 'login' | 'register' | 'init'
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
      let data;
      
      if (mode === 'register') {
        // 注册
        data = await request.post('/auth/register', {
          username: values.username,
          password: values.password
        });
      } else if (mode === 'init') {
        // 初始化管理员
        data = await request.post('/auth/init', {
          username: values.username,
          password: values.password
        });
      } else {
        // 登录
        data = await request.post('/auth/login', {
          username: values.username,
          password: values.password
        });
      }
      
      setAuth(data.token, data.user);
      setInitialized(true);
      
      // 登录/注册成功后初始化离线数据缓存
      try {
        if (navigator.onLine) {
          await syncEngine.pullLatestData();
          console.log('[Auth] 离线数据缓存初始化完成');
        }
      } catch (syncErr) {
        console.warn('[Auth] 离线数据缓存初始化失败（不影响使用）:', syncErr.message);
      }
      
      message.success(mode === 'register' ? '注册成功' : (mode === 'init' ? '初始化成功' : '登录成功'));
      navigate('/dashboard');
    } catch (e) {
      // error toast handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  if (!mode) return null;

  const isRegister = mode === 'register';
  const isInit = mode === 'init';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Typography.Title level={3} style={{ color: '#5B6CFF', marginBottom: 4 }}>人脉知识库</Typography.Title>
          <Typography.Text type="secondary">
            {isRegister ? '注册新账号' : isInit ? '初始化管理员账号' : '登录'}
          </Typography.Text>
        </div>
        <Form onFinish={handleSubmit} layout="vertical" size="large" key={mode}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }, { min: 2, message: '用户名至少2位' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          {isRegister && (
            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
            </Form.Item>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {isRegister ? '注册' : isInit ? '初始化' : '登录'}
            </Button>
          </Form.Item>
        </Form>
        
        {!isInit && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ textAlign: 'center' }}>
              {isRegister ? (
                <Typography.Text type="secondary">
                  已有账号？{' '}
                  <Typography.Link onClick={() => setMode('login')}>
                    返回登录
                  </Typography.Link>
                </Typography.Text>
              ) : (
                <Typography.Text type="secondary">
                  没有账号？{' '}
                  <Typography.Link onClick={() => setMode('register')}>
                    注册新账号
                  </Typography.Link>
                </Typography.Text>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
