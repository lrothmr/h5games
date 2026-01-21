import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, message, Dropdown, Switch, Space } from 'antd';
import {
  HomeOutlined,
  ReloadOutlined,
  ToolOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  SettingOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons';
import { gameService, Game } from '../../services/gameService';
import { saveService } from '../../services/saveService';
import { useUserStore } from '../../stores/userStore';

export default function GamePlay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useUserStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [autoSave, setAutoSave] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- 全屏逻辑 ---
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        message.error(`无法开启全屏: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      message.warning('请登录后游玩');
      navigate('/', { state: { showLogin: true } });
      return;
    }
    if (id) {
      fetchGame();
      loadSettings();
    }
  }, [id, isAuthenticated]);

  const fetchGame = async () => {
    if (!id) return;
    try {
      const data = await gameService.getById(id);
      setGame(data);
      // 临时跳过 VFS 准备
      // await prepareVFS(id, data.url);
    } catch {
      message.error('游戏不存在');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const isAuto = await saveService.getAutoSave();
      setAutoSave(isAuto);
    } catch (err) {
      console.error('加载设置失败', err);
    }
  };

  // --- 存档核心逻辑 ---
  const handleCloudSave = async () => {
    if (!iframeRef.current || !id) return;
    try {
      // 尝试获取 iframe 内的所有 localStorage 数据
      // 注意：只有同源或配置了正确策略时才有效
      const iframeWindow = iframeRef.current.contentWindow;
      if (!iframeWindow) throw new Error('无法访问游戏窗口');
      
      const saveData: Record<string, string> = {};
      for (let i = 0; i < iframeWindow.localStorage.length; i++) {
        const key = iframeWindow.localStorage.key(i);
        if (key) saveData[key] = iframeWindow.localStorage.getItem(key) || '';
      }

      await saveService.upload(id, saveData);
      message.success('存档已同步到云端');
      setMenuVisible(false);
    } catch (error) {
      message.error('保存失败：由于浏览器安全限制，无法跨域读取存档');
    }
  };

  const handleCloudLoad = async () => {
    if (!iframeRef.current || !id) return;
    try {
      const saveData = await saveService.download(id);
      if (!saveData) {
        message.warning('云端暂无存档');
        return;
      }

      const iframeWindow = iframeRef.current.contentWindow;
      if (!iframeWindow) throw new Error('无法访问游戏窗口');

      // 注入存档
      Object.entries(saveData).forEach(([key, value]) => {
        iframeWindow.localStorage.setItem(key, value as string);
      });

      message.success('存档已加载，正在重载游戏...');
      setIframeKey(prev => prev + 1);
      setMenuVisible(false);
    } catch (error) {
      message.error('读取失败：跨域限制或网络错误');
    }
  };

  const handleToggleAutoSave = async (checked: boolean) => {
    try {
      await saveService.setAutoSave(checked);
      setAutoSave(checked);
      message.success(`自动存档已${checked ? '开启' : '关闭'}`);
    } catch (err) {
      message.error('设置失败');
    }
  };

  const menuItems: any[] = [
    {
      key: 'fullscreen',
      icon: isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />,
      label: isFullscreen ? '退出全屏' : '全屏游玩',
      onClick: toggleFullscreen,
    },
    {
      key: 'divider1',
      type: 'divider',
    },
    {
      key: 'save',
      icon: <CloudUploadOutlined />,
      label: '云端保存',
      onClick: handleCloudSave,
    },
    {
      key: 'load',
      icon: <CloudDownloadOutlined />,
      label: '云端下载',
      onClick: handleCloudLoad,
    },
    {
      key: 'divider2',
      type: 'divider',
    },
    {
      key: 'reload',
      icon: <ReloadOutlined />,
      label: '重载游戏',
      onClick: () => { setIframeKey(k => k + 1); setMenuVisible(false); },
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: (
        <Space onClick={e => e.stopPropagation()}>
          <span>自动同步</span>
          <Switch size="small" checked={autoSave} onChange={handleToggleAutoSave} />
        </Space>
      ),
    },
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: '返回主页',
      onClick: () => navigate('/'),
    },
  ];

  if (loading || !game) {
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

  return (
    <div ref={containerRef} style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      <iframe
        ref={iframeRef}
        key={iframeKey}
        src={game.url}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        title={game.name}
        allow="fullscreen"
      />

      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        open={menuVisible}
        onOpenChange={setMenuVisible}
        placement="topLeft"
      >
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<ToolOutlined />}
          style={{
            position: 'absolute',
            bottom: isFullscreen ? 20 : 40,
            right: 20,
            zIndex: 1000,
            width: 50,
            height: 50,
            opacity: menuVisible ? 1 : 0.6,
            transition: 'opacity 0.3s',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}
        />
      </Dropdown>
    </div>
  );
}
