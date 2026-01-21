import { useState, useEffect } from 'react';
import { Table, Button, Card, message, Tag, Space, Modal, InputNumber, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminService, InviteCode } from '../../services/adminService';

export default function InviteCodes() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState(1);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const data = await adminService.getInviteCodes();
      setCodes(data);
    } catch {
      message.error('获取邀请码列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await adminService.generateInviteCode(generateCount);
      message.success(`成功生成 ${generateCount} 个邀请码`);
      setGenerateModalOpen(false);
      fetchCodes();
    } catch {
      message.error('生成邀请码失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminService.deleteInviteCode(id);
      message.success('删除成功');
      fetchCodes();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '邀请码',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Tag color="blue" style={{ fontSize: 14, padding: '4px 8px' }}>{text}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'isUsed',
      key: 'isUsed',
      render: (isUsed: boolean) => (
        <Tag color={isUsed ? 'red' : 'green'}>
          {isUsed ? '已使用' : '未使用'}
        </Tag>
      ),
    },
    {
      title: '使用者',
      dataIndex: 'usedBy',
      key: 'usedBy',
      render: (text: string) => text || '-',
    },
    {
      title: '生成时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '使用时间',
      dataIndex: 'usedAt',
      key: 'usedAt',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: InviteCode) => (
        <Space size="middle">
          <Popconfirm
            title="确定要删除这个邀请码吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="邀请码管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchCodes} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setGenerateModalOpen(true)}>
              生成邀请码
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={codes}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="生成邀请码"
        open={generateModalOpen}
        onOk={handleGenerate}
        onCancel={() => setGenerateModalOpen(false)}
        confirmLoading={generating}
      >
        <div style={{ padding: '20px 0' }}>
          <p>请输入要生成的邀请码数量：</p>
          <InputNumber
            min={1}
            max={50}
            value={generateCount}
            onChange={(value) => setGenerateCount(value || 1)}
            style={{ width: '100%' }}
          />
        </div>
      </Modal>
    </div>
  );
}
