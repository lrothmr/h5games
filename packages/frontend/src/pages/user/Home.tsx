import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Input,
  Card,
  Row,
  Col,
  Tag,
  Button,
  Spin,
  Empty,
  message,
  Modal,
  Image,
  Dropdown,
  Avatar,
} from 'antd';
import {
  SearchOutlined,
  HeartOutlined,
  HeartFilled,
  EyeOutlined,
  PushpinFilled,
  ThunderboltOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { gameService, Game } from '../../services/gameService';
import { useUserStore } from '../../stores/userStore';
import AuthModal from '../../components/AuthModal';

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [likedGames, setLikedGames] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();
  const { deviceId, isAuthenticated, username, logout } = useUserStore();

  useEffect(() => {
    fetchGames();
    fetchLikedGames();
  }, []);

  const fetchGames = async () => {
    try {
      const data = await gameService.getAll();
      setGames(data.filter((g) => g.open));
    } catch {
      message.error('获取游戏列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedGames = async () => {
    try {
      const liked = await gameService.getLikedGames(deviceId);
      setLikedGames(liked);
    } catch {
      console.error('获取点赞状态失败');
    }
  };

  const handlePlay = async (game: Game) => {
    if (!isAuthenticated) {
      message.warning('请先登录后再玩游戏');
      setAuthModalOpen(true);
      return;
    }

    try {
      await gameService.recordClick(game.id);
    } catch {
      console.error('记录点击失败');
    }
    navigate(`/play/${game.id}`);
  };

  const handleLike = async (game: Game, e: React.MouseEvent) => {
    e.stopPropagation();
    if (likedGames.includes(game.id)) {
      message.info('已经点赞过了');
      return;
    }

    try {
      await gameService.recordLike(game.id, deviceId);
      setLikedGames([...likedGames, game.id]);
      setGames(
        games.map((g) =>
          g.id === game.id ? { ...g, likes: g.likes + 1 } : g
        )
      );
      message.success('点赞成功');
    } catch {
      message.error('点赞失败');
    }
  };

  const filteredGames = useMemo(() => {
    return games.filter((game) =>
      game.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [games, searchText]);

  const isNewGame = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1400, margin: '0 auto', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        {isAuthenticated ? (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{username}</span>
            </div>
          </Dropdown>
        ) : (
          <Button type="primary" onClick={() => setAuthModalOpen(true)}>
            登录 / 注册
          </Button>
        )}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 800,
            background: 'linear-gradient(45deg, #4a6ee0, #6b8cff, #ff6b6b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 16,
          }}
        >
          摸鱼大全
        </h1>
        <p style={{ color: '#666', fontSize: 16 }}>🎮 精选小游戏，摸鱼必备</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <Input
          placeholder="搜索游戏..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 400, width: '100%' }}
          size="large"
          allowClear
        />
      </div>

      <div
        style={{
          background: 'rgba(255, 107, 107, 0.05)',
          border: '1px solid rgba(255, 107, 107, 0.2)',
          borderRadius: 12,
          padding: '12px 20px',
          marginBottom: 32,
          textAlign: 'center',
          color: '#ff6b6b',
          fontSize: 14,
        }}
      >
        📢 首次加载缓慢，请耐心等待 | 🖱️ 点击图片可查看大图 | ❤️ 喜欢可以点个赞
      </div>

      {filteredGames.length === 0 ? (
        <Empty description="没有找到游戏" />
      ) : (
        <Row gutter={[24, 24]}>
          {filteredGames.map((game) => (
            <Col xs={24} sm={12} md={8} lg={6} key={game.id}>
              <Card
                hoverable
                cover={
                  <div
                    style={{ position: 'relative', height: 180, overflow: 'hidden' }}
                    onClick={() => setPreviewImage(game.image || '/images/ErrorTitle.png')}
                  >
                    <img
                      src={game.image || '/images/ErrorTitle.png'}
                      alt={game.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/ErrorTitle.png';
                      }}
                    />
                    {game.pinned && (
                      <Tag
                        color="gold"
                        icon={<PushpinFilled />}
                        style={{ position: 'absolute', top: 10, right: 10 }}
                      >
                        置顶
                      </Tag>
                    )}
                    {isNewGame(game.createdAt) && (
                      <Tag
                        color="green"
                        icon={<ThunderboltOutlined />}
                        style={{ position: 'absolute', top: 10, left: 10 }}
                      >
                        新游戏
                      </Tag>
                    )}
                  </div>
                }
                actions={[
                  <span key="clicks">
                    <EyeOutlined /> {game.clicks}
                  </span>,
                  <span
                    key="likes"
                    onClick={(e) => handleLike(game, e)}
                    style={{ cursor: 'pointer' }}
                  >
                    {likedGames.includes(game.id) ? (
                      <HeartFilled style={{ color: '#ff6b6b' }} />
                    ) : (
                      <HeartOutlined />
                    )}{' '}
                    {game.likes}
                  </span>,
                ]}
              >
                <Card.Meta
                  title={
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {game.name}
                    </span>
                  }
                />
                <Button
                  type="primary"
                  block
                  style={{ marginTop: 16 }}
                  onClick={() => handlePlay(game)}
                >
                  开始游戏
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <div style={{ textAlign: 'center', marginTop: 60, padding: '40px 0', borderTop: '1px solid #eee' }}>
        <p style={{ color: '#999' }}>🎮 摸摸鱼·摸鱼游戏 | 有问题联系贴主 🎮</p>
      </div>

      <Modal
        open={!!previewImage}
        footer={null}
        onCancel={() => setPreviewImage(null)}
        width="auto"
        centered
        styles={{ body: { padding: 0 } }}
      >
        <Image
          src={previewImage || ''}
          alt="预览"
          style={{ maxHeight: '80vh', maxWidth: '90vw' }}
          preview={false}
        />
      </Modal>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
