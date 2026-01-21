import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Switch,
  Button,
  Card,
  Upload,
  Image,
  message,
  Spin,
  Space,
  Modal,
} from 'antd';
import { UploadOutlined, ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons';
import { gameService, Game } from '../../services/gameService';

export default function GameEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchGame();
    }
  }, [id]);

  const fetchGame = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await gameService.getById(id);
      setGame(data);
      setImageUrl(data.image || '');
      form.setFieldsValue({
        name: data.name,
        url: data.url,
        pinned: data.pinned,
        open: data.open,
      });
    } catch {
      message.error('获取游戏信息失败');
      navigate('/admin/games');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: { name: string; url: string; pinned: boolean; open: boolean }) => {
    if (!id) return;
    setSaving(true);
    try {
      await gameService.update(id, values);
      message.success('保存成功');
      navigate('/admin/games');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!id) return;
    try {
      const newImageUrl = await gameService.uploadImage(id, file);
      setImageUrl(newImageUrl);
      message.success('图片上传成功');
    } catch {
      message.error('图片上传失败');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/games')}
        >
          返回列表
        </Button>
      </div>

      <Card title={`编辑游戏: ${game?.name || ''}`}>
        <div style={{ display: 'flex', gap: 48 }}>
          <div style={{ flex: 1 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ pinned: false, open: true }}
            >
              <Form.Item
                label="游戏名称"
                name="name"
                rules={[{ required: true, message: '请输入游戏名称' }]}
              >
                <Input placeholder="请输入游戏名称" />
              </Form.Item>

              <Form.Item
                label="游戏路径"
                name="url"
              >
                <Input placeholder="游戏访问路径" disabled />
              </Form.Item>

              <Form.Item
                label="置顶"
                name="pinned"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="开放状态"
                name="open"
                valuePropName="checked"
              >
                <Switch checkedChildren="开放" unCheckedChildren="关闭" />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={saving}>
                    保存
                  </Button>
                  <Button onClick={() => navigate('/admin/games')}>
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>

          <div style={{ width: 300 }}>
            <Card title="游戏封面" size="small">
              <div style={{ marginBottom: 16 }}>
                <Image
                  src={imageUrl || '/images/ErrorTitle.png'}
                  alt="封面"
                  style={{ width: '100%', borderRadius: 8 }}
                  fallback="/images/ErrorTitle.png"
                />
              </div>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleImageUpload(file);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />} block>
                  更换封面
                </Button>
              </Upload>
            </Card>

            <Card title="预览" size="small" style={{ marginTop: 16 }}>
              <Button
                icon={<EyeOutlined />}
                block
                onClick={() => setPreviewVisible(true)}
              >
                预览游戏
              </Button>
            </Card>
          </div>
        </div>
      </Card>

      <Modal
        title={game?.name}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        styles={{ body: { height: 'calc(100vh - 150px)', padding: 0 } }}
      >
        {game && (
          <iframe
            src={game.url}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={game.name}
          />
        )}
      </Modal>
    </div>
  );
}
