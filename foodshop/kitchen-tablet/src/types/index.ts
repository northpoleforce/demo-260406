// 订单状态枚举
export enum OrderState {
  QUEUED = 'queued',        // 排队中
  COOKING = 'cooking',      // 制作中
  READY = 'ready',          // 即将上桌
  SERVED = 'served',        // 已上桌
}

// 订单项
export interface OrderItem {
  item_id: string;
  order_id: string;
  dish_name: string;
  qty: number;
  item_state: OrderState;
}

// 订单
export interface Order {
  order_id: string;
  table_id: string;
  created_at: string;
  updated_at: string;
  current_state: OrderState;
  version: number;
  items: OrderItem[];
  urge_requested?: boolean;  // 是否被催单
  urge_count?: number;        // 催单次数
}

// 催单事件
export interface UrgeEvent {
  event_id: string;
  order_id: string;
  table_id: string;
  source: 'voice' | 'manual';
  confidence?: number;
  request_id: string;
  created_at: string;
}

// 设备状态
export interface DeviceStatus {
  device_id: string;
  device_type: 'kitchen' | 'table' | 'voice';
  last_seen_at: string;
  is_online: boolean;
}

// WebSocket 消息类型
export enum WSMessageType {
  ORDER_UPDATED = 'order.updated',
  URGE_CREATED = 'urge.created',
  DEVICE_OFFLINE = 'device.offline',
  SYSTEM_DEGRADED = 'system.degraded',
}

// WebSocket 消息
export interface WSMessage<T = any> {
  type: WSMessageType;
  event_id: string;
  timestamp: string;
  data: T;
}

// 订单更新消息数据
export interface OrderUpdatedData {
  order: Order;
}

// 催单创建消息数据
export interface UrgeCreatedData {
  urge: UrgeEvent;
  order: Order;
}

// 设备离线消息数据
export interface DeviceOfflineData {
  device: DeviceStatus;
}

// 系统降级消息数据
export interface SystemDegradedData {
  reason: string;
  affected_services: string[];
}

// API 响应
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 快照数据
export interface SnapshotData {
  orders: Order[];
  timestamp: string;
  is_full: boolean;  // 是否为全量快照
}

// 状态变更请求
export interface StateChangeRequest {
  target_state: OrderState;
  operator: string;
  version: number;
}

export interface ItemStateChangeRequest {
  target_state: OrderState;
  operator: string;
}

// 催单请求
export interface UrgeRequest {
  source: 'voice' | 'manual';
  confidence?: number;
  asr_provider?: string;
  asr_latency_ms?: number;
}

export interface CreateOrderItemRequest {
  dish_name: string;
  qty: number;
}

export interface CreateOrderRequest {
  table_id: string;
  items: CreateOrderItemRequest[];
}

// 统计数据
export interface StatsData {
  today_completed: number;      // 今日完成订单数
  in_progress: number;          // 当前进行中订单数
  avg_cooking_time: number;     // 平均出餐时间（秒）
  urge_response_rate: number;   // 催单响应率（%）
  total_urges: number;          // 今日催单总数
}

// 配置
export interface Config {
  confirm_before_action: boolean;  // 操作前二次确认
  sound_enabled: boolean;           // 声音提醒开关
  sound_volume: number;             // 音量 (0-1)
  sort_mode: 'time' | 'urge';      // 排序模式
  mute_until?: number;              // 静音截止时间戳
}

// 排序模式
export type SortMode = 'time' | 'urge';
