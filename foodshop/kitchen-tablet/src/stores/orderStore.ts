import { create } from 'zustand';
import type {
  Order,
  OrderState,
  WSMessage,
  WSMessageType,
  OrderUpdatedData,
  UrgeCreatedData,
  SortMode,
} from '@/types';
import { apiService } from '@/services/api';

interface OrderStore {
  orders: Map<string, Order>;
  loading: boolean;
  error: string | null;
  lastSyncTime: string | null;
  
  // Actions
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  removeOrder: (orderId: string) => void;
  
  // Business logic
  changeOrderState: (orderId: string, targetState: OrderState, operator: string) => Promise<boolean>;
  changeOrderItemState: (orderId: string, itemId: string, targetState: OrderState, operator: string) => Promise<boolean>;
  handleWSMessage: (message: WSMessage) => void;
  syncSnapshot: (since?: string) => Promise<void>;
  
  // Queries
  getOrdersByState: (state: OrderState) => Order[];
  getSortedOrders: (mode: SortMode) => Order[];
  getOrder: (orderId: string) => Order | undefined;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: new Map(),
  loading: false,
  error: null,
  lastSyncTime: null,

  // 设置订单列表
  setOrders: (orders) => {
    const orderMap = new Map<string, Order>();
    orders.forEach(order => orderMap.set(order.order_id, order));
    set({ orders: orderMap, lastSyncTime: new Date().toISOString() });
  },

  // 添加订单
  addOrder: (order) => {
    set((state) => {
      const newOrders = new Map(state.orders);
      newOrders.set(order.order_id, order);
      return { orders: newOrders };
    });
  },

  // 更新订单
  updateOrder: (order) => {
    set((state) => {
      const newOrders = new Map(state.orders);
      newOrders.set(order.order_id, order);
      return { orders: newOrders };
    });
  },

  // 删除订单
  removeOrder: (orderId) => {
    set((state) => {
      const newOrders = new Map(state.orders);
      newOrders.delete(orderId);
      return { orders: newOrders };
    });
  },

  // 改变订单状态（乐观更新 + 服务端确认）
  changeOrderState: async (orderId, targetState, operator) => {
    const order = get().orders.get(orderId);
    if (!order) {
      console.error(`Order ${orderId} not found`);
      return false;
    }

    // 保存原始状态用于回滚
    const originalState = order.current_state;
    const originalVersion = order.version;

    // 乐观更新 UI
    const optimisticOrder: Order = {
      ...order,
      current_state: targetState,
      version: order.version + 1,
      updated_at: new Date().toISOString(),
    };
    get().updateOrder(optimisticOrder);

    try {
      // 调用 API
      const response = await apiService.updateOrderState(orderId, {
        target_state: targetState,
        operator,
        version: originalVersion,
      });

      if (response.success && response.data) {
        // 使用服务端返回的数据
        get().updateOrder(response.data);
        return true;
      } else {
        // 失败，回滚
        console.error('Failed to update order state:', response.error);
        const rollbackOrder: Order = {
          ...order,
          current_state: originalState,
          version: originalVersion,
        };
        get().updateOrder(rollbackOrder);
        set({ error: response.error?.message || 'Failed to update order state' });
        return false;
      }
    } catch (error) {
      // 网络错误，回滚
      console.error('Network error while updating order state:', error);
      const rollbackOrder: Order = {
        ...order,
        current_state: originalState,
        version: originalVersion,
      };
      get().updateOrder(rollbackOrder);
      set({ error: 'Network error' });
      return false;
    }
  },

  changeOrderItemState: async (orderId, itemId, targetState, operator) => {
    const order = get().orders.get(orderId);
    if (!order) {
      console.error(`Order ${orderId} not found`);
      return false;
    }

    const originalOrder = order;
    const optimisticItems = order.items.map((it) =>
      it.item_id === itemId ? { ...it, item_state: targetState } : it
    );
    const states = optimisticItems.map((i) => i.item_state);
    let nextOrderState: OrderState = 'served' as OrderState;
    if (states.includes('cooking' as OrderState)) nextOrderState = 'cooking' as OrderState;
    else if (states.includes('queued' as OrderState)) nextOrderState = 'queued' as OrderState;
    else if (states.includes('ready' as OrderState)) nextOrderState = 'ready' as OrderState;

    get().updateOrder({
      ...order,
      items: optimisticItems,
      current_state: nextOrderState,
      version: order.version + 1,
      updated_at: new Date().toISOString(),
    });

    try {
      const response = await apiService.updateOrderItemState(orderId, itemId, {
        target_state: targetState,
        operator,
      });

      if (response.success && response.data) {
        get().updateOrder(response.data);
        return true;
      }

      get().updateOrder(originalOrder);
      set({ error: response.error?.message || 'Failed to update item state' });
      return false;
    } catch (error) {
      console.error('Network error while updating item state:', error);
      get().updateOrder(originalOrder);
      set({ error: 'Network error' });
      return false;
    }
  },

  // 处理 WebSocket 消息
  handleWSMessage: (message) => {
    switch (message.type as WSMessageType) {
      case 'order.updated': {
        const data = message.data as OrderUpdatedData;
        get().updateOrder(data.order);
        break;
      }
      case 'urge.created': {
        const data = message.data as UrgeCreatedData;
        // 更新订单的催单标记
        const order = data.order;
        get().updateOrder({
          ...order,
          urge_requested: true,
          urge_count: (order.urge_count || 0) + 1,
        });
        break;
      }
      default:
        // 其他消息类型暂不处理
        break;
    }
  },

  // 同步快照数据
  syncSnapshot: async (since) => {
    set({ loading: true, error: null });
    
    try {
      const response = await apiService.getSnapshot(since);
      
      if (response.success && response.data) {
        get().setOrders(response.data.orders);
      } else {
        set({ error: response.error?.message || 'Failed to sync snapshot' });
      }
    } catch (error) {
      console.error('Error syncing snapshot:', error);
      set({ error: 'Network error while syncing' });
    } finally {
      set({ loading: false });
    }
  },

  // 按状态查询订单
  getOrdersByState: (state) => {
    const orders = Array.from(get().orders.values());
    return orders.filter(order => order.current_state === state);
  },

  // 获取排序后的订单列表
  getSortedOrders: (mode) => {
    const orders = Array.from(get().orders.values());
    
    if (mode === 'urge') {
      // 催单优先排序
      return orders.sort((a, b) => {
        // 首先按催单状态排序
        const aUrge = a.urge_requested ? 1 : 0;
        const bUrge = b.urge_requested ? 1 : 0;
        if (aUrge !== bUrge) return bUrge - aUrge;
        
        // 然后按创建时间排序（早的在前）
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    } else {
      // 按时间排序（默认）
      return orders.sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }
  },

  // 获取单个订单
  getOrder: (orderId) => {
    return get().orders.get(orderId);
  },
}));
