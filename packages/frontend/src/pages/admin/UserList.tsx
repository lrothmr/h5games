import { useState, useEffect } from 'react';
import { Table, Card, Tag, message } from 'antd';
import { adminService } from '../../services/adminService';

export default function UserList() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers();
      setData(res);
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取失败');
    } finally {
      setLoading(false);
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
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => <span style={{ fontWeight: 'bold' }}>{text}</span>,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '云存档',
      dataIndex: 'autoSave',
      key: 'autoSave',
      render: (autoSave: boolean) => (
        autoSave ? <Tag color="blue">开启</Tag> : <Tag color="default">关闭</Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
  ];

  return (
    <Card title="用户管理">
      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="id" 
        loading={loading}
      />
    </Card>
  );
}