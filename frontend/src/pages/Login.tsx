import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Divider,
  message,
  Tabs
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  LoginOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Content } = Layout;
const { Title, Text } = Typography;

// Types
interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('login');
  const [loading, setLoading] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  // Handle URL parameters for auto-fill
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const email = params.get('email');
    const password = params.get('password');
    
    if (email && password) {
      loginForm.setFieldsValue({ email, password });
      // 自動提示用戶可以直接登入
      message.info('已自動填入Admin帳號，請點擊登入', 3);
    }
  }, [location.search, loginForm]);

  // Handle login
  const handleLogin = async (values: LoginFormData) => {
    setLoading(true);
    try {
      const success = await login(values.email, values.password);
      if (success) {
        message.success('登入成功！');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle register
  const handleRegister = async (values: RegisterFormData) => {
    setLoading(true);
    try {
      const success = await register(values.email, values.password, values.confirmPassword, values.fullName);
      if (success) {
        message.success('註冊成功！歡迎加入ETC點雲標注系統');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  const items = [
    {
      key: 'login',
      label: (
        <Space>
          <LoginOutlined />
          登入
        </Space>
      ),
      children: (
        <>
          <Form
            form={loginForm}
            name="login"
            onFinish={handleLogin}
            autoComplete="off"
            size="large"
            layout="vertical"
          >
            <Form.Item
              label="電子郵件"
              name="email"
              rules={[
                { required: true, message: '請輸入電子郵件' },
                { type: 'email', message: '請輸入有效的電子郵件格式' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="admin@etc.com"
              />
            </Form.Item>

            <Form.Item
              label="密碼"
              name="password"
              rules={[
                { required: true, message: '請輸入密碼' },
                { min: 6, message: '密碼至少需要6個字符' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="請輸入密碼"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{ width: '100%', height: '48px' }}
                icon={<LoginOutlined />}
              >
                {loading ? '登入中...' : '登入'}
              </Button>
            </Form.Item>
          </Form>

          {/* Demo credentials */}
          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            background: '#f6f8ff', 
            borderRadius: '8px',
            border: '1px solid #d9e2ff'
          }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>測試帳號：</strong><br />
              郵箱：admin@etc.com<br />
              密碼：admin123
            </Text>
          </div>
        </>
      )
    },
    {
      key: 'register',
      label: (
        <Space>
          <UserAddOutlined />
          註冊
        </Space>
      ),
      children: (
        <Form
          form={registerForm}
          name="register"
          onFinish={handleRegister}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            label="姓名"
            name="fullName"
            rules={[
              { required: true, message: '請輸入您的姓名' },
              { min: 2, message: '姓名至少需要2個字符' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="請輸入您的姓名"
            />
          </Form.Item>

          <Form.Item
            label="電子郵件"
            name="email"
            rules={[
              { required: true, message: '請輸入電子郵件' },
              { type: 'email', message: '請輸入有效的電子郵件格式' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="your.email@company.com"
            />
          </Form.Item>

          <Form.Item
            label="密碼"
            name="password"
            rules={[
              { required: true, message: '請輸入密碼' },
              { min: 6, message: '密碼至少需要6個字符' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="請輸入密碼"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            label="確認密碼"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '請確認密碼' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('兩次輸入的密碼不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="請再次輸入密碼"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%', height: '48px' }}
              icon={<UserAddOutlined />}
            >
              {loading ? '註冊中...' : '註冊帳戶'}
            </Button>
          </Form.Item>
        </Form>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Content style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '50px 24px'
      }}>
        <Card
          style={{
            width: '100%',
            maxWidth: 500,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            borderRadius: '12px'
          }}
          styles={{ body: { padding: '40px' } }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ marginBottom: '16px' }}>
              <UserOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            </div>
            <Title level={2} style={{ margin: 0, color: '#262626' }}>
              ETC 點雲標注系統
            </Title>
            <Text type="secondary">
              歡迎回來，請登入您的帳戶
            </Text>
          </div>

          {/* Tabs */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            centered
            size="large"
            items={items}
          />

          <Divider />

          {/* Footer */}
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              © 2024 ETC Point Cloud Annotation System. <br />
              專業的點雲數據標注平台
            </Text>
          </div>
        </Card>
      </Content>
    </Layout>
  );
};

export default Login;
