import { useState, useEffect, useCallback } from 'react';
import { Badge, Tooltip, Button, message, Tag, Space } from 'antd';
import { CloudOutlined, CloudFilled, ReloadOutlined, SyncOutlined, AlertOutlined } from '@ant-design/icons';
import { networkMonitor, syncEngine } from '../utils/sync';

export default function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  
  // 监听网络状态变化
  useEffect(() => {
    const unsubscribe = networkMonitor.onChange((type, online) => {
      setIsOnline(online);
      if (online) {
        message.success('网络已恢复，正在同步数据...');
        loadPendingCount();
      } else {
        message.warning('网络已断开，已切换到离线模式');
        loadPendingCount();
      }
    });
    
    return unsubscribe;
  }, []);
  
  // 加载待同步数量
  const loadPendingCount = useCallback(async () => {
    try {
      const status = await syncEngine.getStatus();
      setPendingCount(status.pendingCount);
    } catch (e) {
      console.error('加载待同步数量失败:', e);
    }
  }, []);
  
  // 初始化加载
  useEffect(() => {
    loadPendingCount();
    
    // 每 10 秒检查一次
    const timer = setInterval(loadPendingCount, 10000);
    return () => clearInterval(timer);
  }, [loadPendingCount]);
  
  // 手动同步
  const handleSync = async () => {
    if (!isOnline) {
      message.warning('当前处于离线状态，无法同步');
      return;
    }
    
    try {
      setSyncing(true);
      await syncEngine.manualSync();
      message.success('同步完成');
      loadPendingCount();
    } catch (e) {
      message.error('同步失败: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };
  
  // 状态徽章
  const StatusBadge = () => {
    if (isOnline) {
      return (
        <Tooltip title="在线模式">
          <Tag color="success" icon={<CloudFilled />}>
            在线
          </Tag>
        </Tooltip>
      );
    }
    
    return (
      <Tooltip title="离线模式，数据修改将在网络恢复后同步">
        <Tag color="warning" icon={<AlertOutlined />}>
          离线
        </Tag>
      </Tooltip>
    );
  };
  
  // 待同步计数
  const PendingBadge = () => {
    if (pendingCount === 0) return null;
    
    return (
      <Tooltip title={`有 ${pendingCount} 条修改待同步`}>
        <Tag color="error" style={{ cursor: 'pointer' }} onClick={handleSync}>
          <Space size={4}>
            {syncing ? <SyncOutlined spin /> : <ReloadOutlined />}
            {pendingCount} 待同步
          </Space>
        </Tag>
      </Tooltip>
    );
  };
  
  return (
    <Space size={8}>
      <StatusBadge />
      <PendingBadge />
      {isOnline && pendingCount > 0 && (
        <Button 
          size="small" 
          icon={syncing ? <SyncOutlined spin /> : <ReloadOutlined />}
          onClick={handleSync}
          loading={syncing}
        >
          立即同步
        </Button>
      )}
    </Space>
  );
}
