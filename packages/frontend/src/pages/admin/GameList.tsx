import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Image,
  Popconfirm,
  message,
  Input,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  PushpinOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { gameService, Game } from '../../services/gameService';

export default function GameList() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  const fetchGames = async () => {
    setLoading(true);
    try {
      const data = await gameService.getAll();
      setGames(data);
    } catch {
      message.error('获取游戏列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await gameService.delete(id);
      message.success('删除成功');
      fetchGames();
    } catch {
      message.error('删除失败');
    }
  };

  const handleTogglePinned = async (game: Game) => {
    try {
      await gameService.update(game.id, { pinned: !game.pinned });
      message.success(game.pinned ? '已取消置顶' : '已置顶');
      fetchGames();
    } catch {
      message.error('操作失败');
    }
  };

  const handleToggleOpen = async (game: Game, checked: boolean) => {
    try {
      await gameService.update(game.id, { open: checked });
      message.success(checked ? '已开放' : '已关闭');
      fetchGames();
    } catch {
      message.error('操作失败');
    }
  };

  const filteredGames = games.filter((game) =>
    game.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: ColumnsType<Game> = [
    {
      title: '封面',
      dataIndex: 'image',
      key: 'image',
      width: 100,
      render: (image: string) => (
        <Image
          src={image || '/images/ErrorTitle.png'}
          alt="封面"
          width={80}
          height={60}
          style={{ objectFit: 'cover', borderRadius: 4 }}
          fallback="/images/ErrorTitle.png"
        />
      ),
    },
    {
      title: '游戏名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Game) => (
        <Space>
          {record.pinned && <PushpinOutlined style={{ color: '#faad14' }} />}
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'open',
      key: 'open',
      width: 100,
      render: (open: boolean, record: Game) => (
        <Switch
          checked={open}
          onChange={(checked) => handleToggleOpen(record, checked)}
          checkedChildren="开放"
          unCheckedChildren="关闭"
        />
      ),
    },
    {
      title: '统计',
      key: 'stats',
      width: 150,
      render: (_: unknown, record: Game) => (
        <Space direction="vertical" size={0}>
          <span>点击: {record.clicks}</span>
          <span>点赞: {record.likes}</span>
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: Game) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => window.open(record.url, '_blank')}
          />
          <Button
            type="text"
            icon={<PushpinOutlined />}
            style={{ color: record.pinned ? '#faad14' : undefined }}
            onClick={() => handleTogglePinned(record)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/admin/games/${record.id}/edit`)}
          />
          <Popconfirm
            title="确定删除此游戏？"
            description="删除后将无法恢复，游戏文件也会被删除"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Input
          placeholder="搜索游戏名称"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/games/new')}
        >
          上传游戏
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filteredGames}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个游戏`,
        }}
      />
    </div>
  );
}
