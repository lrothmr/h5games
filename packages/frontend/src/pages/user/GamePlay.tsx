import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, message, Dropdown } from 'antd';
import {
  HomeOutlined,
  ReloadOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { gameService, Game } from '../../services/gameService';

export default function GamePlay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (id) {
      fetchGame();
    }
  }, [id]);

  const fetchGame = async () => {
    if (!id) return;
    try {
      const data = await gameService.getById(id);
      setGame(data);
    } catch {
      message.error('游戏不存在');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
    message.success('游戏已重载');
    setMenuVisible(false);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: '返回主页',
      onClick: handleGoHome,
    },
    {
      key: 'reload',
      icon: <ReloadOutlined />,
      label: '重载游戏',
      onClick: handleReload,
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!game) {
    return null;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff' }}>
      <iframe
        key={iframeKey}
        src={game.url}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title={game.name}
      />

      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        open={menuVisible}
        onOpenChange={setMenuVisible}
        placement="bottomLeft"
      >
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<ToolOutlined />}
          style={{
            position: 'fixed',
            top: 20,
            left: 20,
            zIndex: 1000,
            boxShadow: '0 4px 15px rgba(74, 110, 224, 0.3)',
          }}
        />
      </Dropdown>
    </div>
  );
}
