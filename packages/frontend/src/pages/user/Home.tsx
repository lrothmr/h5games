import { useState, useEffect } from 'react';
import { Input, Row, Col, Card, Tag, Space, Typography, Empty, Badge, Button, Avatar, Dropdown, Spin } from 'antd';
import { SearchOutlined, FireOutlined, UserOutlined, LogoutOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { gameService, Game } from '../../services/gameService';
import { useUserStore } from '../../stores/userStore';
import AuthModal from '../../components/AuthModal';

const { Title, Text } = Typography;

const CATEGORIES = ['全部', '动作', '冒险', '休闲', '益智', '体育', '射击', '其他'];

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, username, logout } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [authModalVisible, setAuthModalVisible] = useState(false);

  useEffect(() => {
    fetchGames();
    // 检查是否是从 GamePlay 被拦截跳回来的
    if (location.state?.showLogin) {
      setAuthModalVisible(true);
    }
  }, [location.state]);

  const fetchGames = async () => {
    try {
      const data = await gameService.getAll();
      setGames(data);
    } catch (err) {
      console.error('获取游戏失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const filteredGames = games.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchText.toLowerCase());
    const gameCategory = (game as any).category || '其他';
    const matchesCategory = activeCategory === '全部' || gameCategory === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handlePlay = (gameId: string) => {
    if (!isAuthenticated) {
      setAuthModalVisible(true);
      return;
    }
    gameService.recordClick(gameId);
    navigate(`/play/${gameId}`);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }} />
        <div style={{ flex: 2, textAlign: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>🎮 摸鱼大全</Title>
          <Text type="secondary">极速、免费、好玩的 H5 游戏集锦</Text>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          {isAuthenticated ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <Text strong>{username}</Text>
              </Space>
            </Dropdown>
          ) : (
            <Button 
              type="primary" 
              shape="round" 
              icon={<LoginOutlined />} 
              onClick={() => setAuthModalVisible(true)}
            >
              登录 / 注册
            </Button>
          )}
        </div>
      </header>

      <AuthModal 
        open={authModalVisible} 
        onClose={() => setAuthModalVisible(false)} 
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={16} justify="center">
          <Col xs={24} sm={18} md={12}>
            <Input
              placeholder="搜索你感兴趣的游戏..."
              prefix={<SearchOutlined />}
              size="large"
              allowClear
              onChange={e => setSearchText(e.target.value)}
              style={{ borderRadius: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
          </Col>
        </Row>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Space wrap>
            {CATEGORIES.map(cat => (
              <Tag.CheckableTag
                key={cat}
                checked={activeCategory === cat}
                onChange={() => setActiveCategory(cat)}
                style={{ fontSize: '14px', padding: '4px 12px', borderRadius: '4px' }}
              >
                {cat}
              </Tag.CheckableTag>
            ))}
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          {loading ? (
            <div style={{ width: '100%', padding: '100px', textAlign: 'center' }}>
              <Spin size="large" />
            </div>
          ) : filteredGames.length > 0 ? (
            filteredGames.map((game) => (
              <Col xs={12} sm={8} md={6} lg={4} key={game.id}>
                <Badge.Ribbon 
                  text="置顶" 
                  color="gold" 
                  style={{ display: game.pinned ? 'block' : 'none' }}
                >
                  <Card
                    hoverable
                    cover={
                      <div style={{ height: 160, overflow: 'hidden', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {game.image ? (
                          <img alt={game.name} src={game.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Title level={4} type="secondary">{game.name[0]}</Title>
                        )}
                      </div>
                    }
                    onClick={() => handlePlay(game.id)}
                    bodyStyle={{ padding: '12px' }}
                    style={{ borderRadius: '12px', overflow: 'hidden' }}
                  >
                    <Card.Meta
                      title={<div style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.name}</div>}
                      description={
                        <Space split={<Text type="secondary" style={{ fontSize: '10px' }}>|</Text>}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            <FireOutlined style={{ color: '#ff4d4f' }} /> {game.clicks}
                          </Text>
                          <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>{(game as any).category || '休闲'}</Tag>
                        </Space>
                      }
                    />
                  </Card>
                </Badge.Ribbon>
              </Col>
            ))
          ) : (
            <div style={{ width: '100%', padding: '48px' }}>
              <Empty description="没有找到匹配的游戏" />
            </div>
          )}
        </Row>
      </Space>
    </div>
  );
}