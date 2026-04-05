import { useEffect, useState } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { OrderBoard } from './components/OrderBoard';
import { StatsPanel } from './components/StatsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { OfflineIndicator } from './components/OfflineIndicator';
import { UrgeAlertManager } from './components/UrgeAlert';
import { wsService } from './services/websocket';
import { useOrderStore } from './stores/orderStore';
import { audioService } from './services/audio';
import type { UrgeEvent, Order, WSMessageType } from './types';
import './index.css';

function App() {
  const { handleWSMessage, syncSnapshot } = useOrderStore();
  const [isOnline, setIsOnline] = useState(true);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [urgeAlerts, setUrgeAlerts] = useState<Array<{ urge: UrgeEvent; order: Order }>>([]);

  useEffect(() => {
    // 初始化音频服务（用户交互后激活）
    const handleUserInteraction = () => {
      audioService.resume();
      document.removeEventListener('click', handleUserInteraction);
    };
    document.addEventListener('click', handleUserInteraction);

    // 初始同步数据
    syncSnapshot();

    // 连接 WebSocket
    wsService.onConnected = () => {
      console.log('Connected to WebSocket');
      setIsOnline(true);
      setReconnectAttempt(0);
      // 重连后同步快照
      syncSnapshot();
    };

    wsService.onDisconnected = () => {
      console.log('Disconnected from WebSocket');
      setIsOnline(false);
    };

    wsService.onError = (error) => {
      console.error('WebSocket error:', error);
      setIsOnline(false);
    };

    // 订阅所有消息
    const unsubscribe = wsService.subscribe('all', (message) => {
      console.log('Received WebSocket message:', message);
      handleWSMessage(message);

      // 处理催单消息
      if (message.type === 'urge.created' as WSMessageType) {
        const data = message.data as any;
        setUrgeAlerts((prev) => [
          ...prev,
          { urge: data.urge, order: data.order },
        ]);
      }
    });

    wsService.connect();

    // 清理
    return () => {
      unsubscribe();
      wsService.disconnect();
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [handleWSMessage, syncSnapshot]);

  // 监听重连尝试
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => {
        setReconnectAttempt((prev) => prev + 1);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  const handleDismissUrge = (urgeId: string) => {
    setUrgeAlerts((prev) => prev.filter((item) => item.urge.event_id !== urgeId));
  };

  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <div className="h-screen flex flex-col bg-gray-100">
          {/* 顶部导航栏 */}
          <header className="bg-slate-900 text-slate-100 shadow-md px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">后厨操作台</h1>
              <div className="text-sm text-slate-300">
                {new Date().toLocaleDateString('zh-CN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* 网络状态指示器 */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'
                  }`}
                />
                <span className="text-sm text-slate-100">
                  {isOnline ? '在线' : '离线'}
                </span>
              </div>
              
              <div className="text-sm text-slate-300">
                {new Date().toLocaleTimeString('zh-CN')}
              </div>
            </div>
          </header>

          {/* 主内容区 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 订单看板 */}
            <main className="flex-1 overflow-hidden">
              <OrderBoard />
            </main>

            {/* 右侧面板 */}
            <aside className="w-80 bg-slate-50 p-4 space-y-4 overflow-y-auto border-l border-slate-200">
              <StatsPanel />
              <SettingsPanel />
            </aside>
          </div>

          {/* 离线指示器 */}
          <OfflineIndicator
            isOffline={!isOnline}
            reconnectAttempt={reconnectAttempt}
          />

          {/* 催单提醒 */}
          <UrgeAlertManager
            urges={urgeAlerts}
            onDismiss={handleDismissUrge}
          />
        </div>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
