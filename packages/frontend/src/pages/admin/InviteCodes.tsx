import { useState, useEffect } from 'react';
import { Table, Button, Card, Space, Modal, InputNumber, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { adminService } from '../../services/adminService';

export default function InviteCodes() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [generateCount, setGenerateCount] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminService.getInviteCodes();
      setData(res);
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      await adminService.generateInviteCode(generateCount);
      message.success(`成功生成 ${generateCount} 个邀请码`);
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '生成失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminService.deleteInviteCode(id);
      message.success('删除成功');
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const columns = [
    {
      title: '邀请码',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => (
        <Space>
          <code style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</code>
          <Button 
            type="text" 
            size="small" 
            icon={<CopyOutlined />} 
            onClick={() => copyToClipboard(text)} 
          />
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isUsed',
      key: 'isUsed',
      render: (isUsed: boolean) => (
        isUsed ? <Tag color="red">已使用</Tag> : <Tag color="green">未使用</Tag>
      ),
    },
    {
      title: '使用者',
      dataIndex: 'usedBy',
      key: 'usedBy',
      render: (text: string) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Popconfirm
          title="确定删除吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card 
      title="邀请码管理" 
      extra={
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => setModalVisible(true)}
        >
          批量生成
        </Button>
      }
    >
      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="id" 
        loading={loading}
      />

      <Modal
        title="批量生成邀请码"
        open={modalVisible}
        onOk={handleGenerate}
        onCancel={() => setModalVisible(false)}
        okText="生成"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>请输入要生成的数量（1-100）：</div>
        <InputNumber 
          min={1} 
          max={100} 
          value={generateCount} 
          onChange={(val) => setGenerateCount(val || 1)} 
          style={{ width: '100%' }}
        />
      </Modal>
    </Card>
  );
}