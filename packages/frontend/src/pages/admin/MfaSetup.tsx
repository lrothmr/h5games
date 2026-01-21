import { useState } from 'react';
import { Card, Button, Steps, message, Typography, Divider, Alert, Input, Form } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { authService } from '../../services/authService';

const { Title, Paragraph, Text } = Typography;

export default function MfaSetup() {
  const [current, setCurrent] = useState(0);
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [form] = Form.useForm();

  const handleSetup = async () => {
    setLoading(true);
    try {
      const data = await authService.setupMfa();
      setSecret(data.secret);
      setQrCodeUrl(data.qrCodeUrl);
      setCurrent(1);
    } catch {
      message.error('生成MFA配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (values: { token: string }) => {
    setVerifying(true);
    try {
      await authService.verifyAndEnableMfa(secret, values.token);
      message.success('MFA验证通过并已开启');
      setCurrent(2);
    } catch {
      message.error('验证码错误，请重试');
    } finally {
      setVerifying(false);
    }
  };

  const steps = [
    {
      title: '开始',
      content: (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <SafetyCertificateOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 24 }} />
          <Title level={4}>启用两步验证 (MFA)</Title>
          <Paragraph>
            为了提高账户安全性，建议您启用两步验证。启用后，登录时需要输入Google Authenticator等应用生成的动态验证码。
          </Paragraph>
          <Button type="primary" onClick={handleSetup} loading={loading} size="large">
            开始配置
          </Button>
        </div>
      ),
    },
    {
      title: '绑定',
      content: (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Title level={4}>扫描二维码</Title>
          <Paragraph>
            请使用 Google Authenticator 或其他支持 TOTP 的应用扫描下方二维码。
          </Paragraph>
          
          <div style={{ margin: '24px 0', display: 'flex', justifyContent: 'center' }}>
            {qrCodeUrl ? (
               <img src={qrCodeUrl} alt="MFA QR Code" width={200} height={200} />
            ) : (
               <div style={{ width: 200, height: 200, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 加载中...
               </div>
            )}
          </div>

          <Paragraph>
            如果无法扫描，请手动输入密钥：
            <br />
            <Text code copyable>{secret}</Text>
          </Paragraph>

          <Divider />

          <Title level={4}>验证并开启</Title>
          <Paragraph>
            请输入应用生成的6位验证码以确认绑定。
          </Paragraph>

          <Form form={form} onFinish={handleVerify} layout="inline" style={{ justifyContent: 'center' }}>
            <Form.Item
              name="token"
              rules={[
                { required: true, message: '请输入验证码' },
                { len: 6, message: '验证码长度应为6位' }
              ]}
            >
              <Input placeholder="6位验证码" maxLength={6} style={{ width: 150, textAlign: 'center' }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={verifying}>
                验证并开启
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      title: '完成',
      content: (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <SafetyCertificateOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
          <Title level={4}>MFA 已开启</Title>
          <Paragraph>
            您的账户现在受到两步验证的保护。下次登录时，您需要输入动态验证码。
          </Paragraph>
          <Alert
            message="请妥善保管您的密钥"
            description="如果丢失手机，您将无法登录后台。请确保已备份密钥。"
            type="info"
            showIcon
            style={{ textAlign: 'left', marginTop: 24, maxWidth: 600, margin: '24px auto' }}
          />
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Card title="安全设置">
        <Steps current={current} items={steps.map(item => ({ title: item.title }))} />
        <Divider />
        <div>{steps[current].content}</div>
      </Card>
    </div>
  );
}
