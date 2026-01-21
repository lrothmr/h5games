import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Modal } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { authService } from '../../services/authService';
import { useAdminStore } from '../../stores/adminStore';

interface LoginForm {
  username: string;
  password: string;
  mfaToken?: string;
}

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [requireMfa, setRequireMfa] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [tempAuthData, setTempAuthData] = useState<{ token: string; username: string; password: string } | null>(null);
  const [changePwdForm] = Form.useForm();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login } = useAdminStore();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const result = await authService.adminLogin(values.username, values.password, values.mfaToken);
      
      if (result.mustChangePassword) {
        setTempAuthData({ token: result.token, username: result.username, password: values.password });
        setMustChangePassword(true);
      } else {
        login(result.token, result.username);
        message.success('登录成功');
        navigate('/admin/games');
      }
    } catch (error: any) {
      if (error.response?.status === 403 && error.response?.data?.requireMfa) {
        setRequireMfa(true);
        message.info('请输入MFA验证码');
      } else {
        message.error(error.response?.data?.message || '用户名或密码错误');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    if (!tempAuthData) return;
    
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('adminToken', tempAuthData.token);
      await authService.changeAdminPassword(tempAuthData.password, values.newPassword);
      
      login(tempAuthData.token, tempAuthData.username);
      message.success('密码修改成功并已登录');
      setMustChangePassword(false);
      navigate('/admin/games');
    } catch (error: any) {
      message.error(error.response?.data?.message || '修改密码失败');
      localStorage.removeItem('adminToken');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          borderRadius: 16,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎮</div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#333' }}>管理后台</h1>
          <p style={{ color: '#999', marginTop: 8 }}>请输入管理员账号登录</p>
        </div>

        <Form
          form={form}
          name="admin-login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
            hidden={requireMfa}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
            hidden={requireMfa}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          {requireMfa && (
            <Form.Item
              name="mfaToken"
              rules={[
                { required: true, message: '请输入MFA验证码' },
                { len: 6, message: '验证码长度应为6位' }
              ]}
            >
              <Input
                prefix={<SafetyCertificateOutlined />}
                placeholder="MFA验证码 (6位数字)"
                maxLength={6}
                autoFocus
              />
            </Form.Item>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 48,
                fontSize: 16,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
              }}
            >
              {requireMfa ? '验证' : '登录'}
            </Button>
          </Form.Item>
          
          {requireMfa && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Button type="link" onClick={() => setRequireMfa(false)}>
                返回登录
              </Button>
            </div>
          )}
        </Form>

        <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
          <a href="/" style={{ color: '#667eea' }}>返回首页</a>
        </div>
      </Card>

      <Modal
        title="首次登录请修改密码"
        open={mustChangePassword}
        footer={null}
        closable={false}
        maskClosable={false}
      >
        <Form
          form={changePwdForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6位' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="新密码" />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            rules={[
              { required: true, message: '请再次输入新密码' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="确认新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              修改并登录
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
