import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Switch,
  Button,
  Card,
  Upload,
  Progress,
  message,
  Space,
  Alert,
} from 'antd';
import { InboxOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { gameService } from '../../services/gameService';

const { Dragger } = Upload;

interface UploadFormValues {
  name: string;
  gameId?: string;
  pinned: boolean;
  open: boolean;
}

export default function GameUpload() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.zip',
    maxCount: 1,
    beforeUpload: (file) => {
      if (!file.name.endsWith('.zip')) {
        message.error('只支持 ZIP 格式文件');
        return false;
      }
      setFile(file);
      const name = file.name.replace('.zip', '');
      form.setFieldValue('name', name);
      return false;
    },
    onRemove: () => {
      setFile(null);
      form.setFieldValue('name', '');
    },
  };

  const onFinish = async (values: UploadFormValues) => {
    if (!file) {
      message.error('请先选择 ZIP 文件');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const result = await gameService.upload(
        file,
        {
          name: values.name,
          gameId: values.gameId,
          pinned: values.pinned,
          open: values.open,
        },
        (percent) => setProgress(percent)
      );

      message.success('上传成功');
      navigate(`/admin/games/${result.id}/edit`);
    } catch (error) {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

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

      <Card title="上传游戏">
        <Alert
          message="上传说明"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>支持 ZIP 格式压缩包</li>
              <li>压缩包内应包含游戏的 index.html 入口文件</li>
              <li>系统会自动解压到 Games 目录</li>
              <li>如果压缩包内有 cover.jpg/png 或 splash.png 等图片，会自动作为封面</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ pinned: false, open: true }}
        >
          <Form.Item label="游戏文件" required>
            <Dragger {...uploadProps} disabled={uploading}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽 ZIP 文件到此区域</p>
              <p className="ant-upload-hint">仅支持 ZIP 格式，最大 2GB</p>
            </Dragger>
          </Form.Item>

          {uploading && (
            <Form.Item>
              <Progress percent={progress} status="active" />
            </Form.Item>
          )}

          <Form.Item
            label="游戏名称"
            name="name"
            rules={[{ required: true, message: '请输入游戏名称' }]}
          >
            <Input placeholder="请输入游戏名称" />
          </Form.Item>

          <Form.Item
            label="游戏ID"
            name="gameId"
            tooltip="可选，留空则自动生成。如需覆盖已有游戏，请填写对应ID"
          >
            <Input placeholder="可选，留空自动生成" />
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
              <Button
                type="primary"
                htmlType="submit"
                loading={uploading}
                disabled={!file}
              >
                {uploading ? '上传中...' : '上传游戏'}
              </Button>
              <Button onClick={() => navigate('/admin/games')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
