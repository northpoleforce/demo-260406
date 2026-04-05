import { create } from 'zustand';
import type { StatsData, OrderState } from '@/types';
import { useOrderStore } from './orderStore';

interface StatsStore extends StatsData {
  lastUpdated: string | null;
  
  // Actions
  updateStats: () => void;
  startAutoRefresh: (intervalMs?: number) => void;
  stopAutoRefresh: () => void;
}

let refreshTimer: number | null = null;

export const useStatsStore = create<StatsStore>((set, get) => ({
  today_completed: 0,
  in_progress: 0,
  avg_cooking_time: 0,
  urge_response_rate: 0,
  total_urges: 0,
  lastUpdated: null,

  // 更新统计数据
  updateStats: () => {
    const orderStore = useOrderStore.getState();
    const allOrders = Array.from(orderStore.orders.values());
    
    // 获取今天的日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    // 今日订单
    const todayOrders = allOrders.filter(order => {
      const orderTime = new Date(order.created_at).getTime();
      return orderTime >= todayTimestamp;
    });
    
    // 今日完成订单数
    const completedOrders = todayOrders.filter(
      order => order.current_state === 'served' as OrderState
    );
    const today_completed = completedOrders.length;
    
    // 当前进行中订单数（非已上桌状态）
    const in_progress = allOrders.filter(
      order => order.current_state !== 'served' as OrderState
    ).length;
    
    // 平均出餐时间（秒）
    let avg_cooking_time = 0;
    if (completedOrders.length > 0) {
      const totalCookingTime = completedOrders.reduce((total, order) => {
        const startTime = new Date(order.created_at).getTime();
        const endTime = new Date(order.updated_at).getTime();
        return total + (endTime - startTime) / 1000; // 转换为秒
      }, 0);
      avg_cooking_time = Math.round(totalCookingTime / completedOrders.length);
    }
    
    // 今日催单总数
    const total_urges = todayOrders.reduce((total, order) => {
      return total + (order.urge_count || 0);
    }, 0);
    
    // 催单响应率（简化计算：已完成订单中被催单的比例）
    let urge_response_rate = 0;
    if (completedOrders.length > 0) {
      const urgedAndCompleted = completedOrders.filter(order => order.urge_requested).length;
      urge_response_rate = Math.round((urgedAndCompleted / completedOrders.length) * 100);
    }
    
    set({
      today_completed,
      in_progress,
      avg_cooking_time,
      urge_response_rate,
      total_urges,
      lastUpdated: new Date().toISOString(),
    });
  },

  // 启动自动刷新（默认30秒）
  startAutoRefresh: (intervalMs = 30000) => {
    get().stopAutoRefresh();
    
    // 立即更新一次
    get().updateStats();
    
    // 设置定时器
    refreshTimer = window.setInterval(() => {
      get().updateStats();
    }, intervalMs);
  },

  // 停止自动刷新
  stopAutoRefresh: () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  },
}));
