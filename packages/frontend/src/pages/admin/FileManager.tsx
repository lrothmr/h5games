import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Card, Button, Breadcrumb, message, Modal, Input, Space, Tag, Typography } from 'antd';
import { 
  FolderFilled, 
  FileTextOutlined, 
  ArrowLeftOutlined, 
  SaveOutlined,
  CodeOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { adminService } from '../../services/adminService';

const { TextArea } = Input;
const { Title, Text } = Typography;

export default function FileManager() {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editContent, setEditingContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (gameId) {
      fetchFiles();
    }
  }, [gameId, currentPath]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await adminService.listFiles(gameId!, currentPath);
      // 排序：文件夹在前，文件在后
      data.sort((a: any, b: any) => (b.isDir ? 1 : 0) - (a.isDir ? 1 : 0));
      setFiles(data);
    } catch (error) {
      message.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFolder = (path: string) => {
    setCurrentPath(path);
  };

  const handleEditFile = async (path: string) => {
    try {
      const content = await adminService.readFile(gameId!, path);
      setEditingFile(path);
      setEditingContent(content);
    } catch (error) {
      message.error('无法读取该文件，可能不是文本格式');
    }
  };

  const handleSave = async () => {
    if (!editingFile) return;
    setSaving(true);
    try {
      await adminService.saveFile(gameId!, editingFile, editContent);
      message.success('文件保存成功');
      setEditingFile(null);
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = currentPath ? currentPath.split('/') : [];

  const columns = [
    {
      title: '名称',
      key: 'name',
      render: (record: any) => (
        <Space onClick={() => record.isDir ? handleOpenFolder(record.path) : handleEditFile(record.path)} style={{ cursor: 'pointer' }}>
          {record.isDir ? <FolderFilled style={{ color: '#ffca28' }} /> : <FileTextOutlined />}
          <span>{record.name}</span>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'isDir',
      render: (isDir: boolean) => isDir ? <Tag color="blue">目录</Tag> : <Tag>文件</Tag>,
    },
    {
      title: '大小',
      dataIndex: 'size',
      render: (size: number, record: any) => record.isDir ? '-' : `${(size / 1024).toFixed(2)} KB`,
    },
    {
      title: '操作',
      key: 'action',
      render: (record: any) => !record.isDir && (
        <Button size="small" icon={<CodeOutlined />} onClick={() => handleEditFile(record.path)}>编辑</Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/games')}>返回列表</Button>
          <Title level={4} style={{ margin: 0 }}>文件管理: {gameId}</Title>
        </Space>
        <Button type="link" icon={<GlobalOutlined />} onClick={() => window.open(`/play/${gameId}`)}>预览游戏</Button>
      </header>

      <Card>
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item>
            <a onClick={() => setCurrentPath('')}>根目录</a>
          </Breadcrumb.Item>
          {breadcrumbs.map((b, i) => (
            <Breadcrumb.Item key={i}>
              <a onClick={() => setCurrentPath(breadcrumbs.slice(0, i + 1).join('/'))}>{b}</a>
            </Breadcrumb.Item>
          ))}
        </Breadcrumb>

        <Table 
          dataSource={files} 
          columns={columns} 
          rowKey="path" 
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={`正在编辑: ${editingFile}`}
        open={!!editingFile}
        onOk={handleSave}
        onCancel={() => setEditingFile(null)}
        width="90%"
        style={{ top: 20 }}
        okText="保存修改"
        confirmLoading={saving}
        cancelText="关闭"
      >
        <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '12px' }}>
          <TextArea
            value={editContent}
            onChange={(e) => setEditingContent(e.target.value)}
            rows={25}
            style={{ 
              fontFamily: 'monospace', 
              fontSize: '14px', 
              background: '#1e1e1e', 
              color: '#d4d4d4', 
              border: 'none',
              resize: 'none'
            }}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">提示：由于浏览器环境限制，仅支持文本类文件编辑。修改后将直接覆盖原始文件。</Text>
        </div>
      </Modal>
    </div>
  );
}
