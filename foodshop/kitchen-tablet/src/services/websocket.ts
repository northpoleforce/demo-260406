import type { WSMessage, WSMessageType } from '@/types';
import { mockNextEvent } from '@/mocks/mockBackend';

type MessageHandler = (message: WSMessage) => void;
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempt: number = 0;
  private maxReconnectDelay: number = 10000; // 最大10秒
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private heartbeatInterval: number = 10000; // 10秒心跳
  private messageHandlers: Map<WSMessageType | 'all', Set<MessageHandler>> = new Map();
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;
  private mockConnected = false;
  private mockTimer: number | null = null;
  
  // 连接状态回调
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;

  constructor(url: string = '') {
    const wsUrl = url || import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/store/default';
    this.url = wsUrl;
  }

  /**
   * 连接 WebSocket
   */
  connect(): void {
    this.shouldReconnect = true;

    if (USE_MOCK) {
      if (this.mockConnected || this.isConnecting) {
        console.log('Mock WebSocket already connected or connecting');
        return;
      }
      this.isConnecting = true;
      window.setTimeout(() => {
        this.isConnecting = false;
        this.mockConnected = true;
        console.log('Mock WebSocket connected');
        this.onConnected?.();
        this.startMockEvents();
      }, 80);
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.isConnecting = true;
    console.log(`Connecting to WebSocket: ${this.url}`);

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempt = 0;
        this.startHeartbeat();
        this.onConnected?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.onError?.(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.stopHeartbeat();
        this.onDisconnected?.();
        
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.isConnecting = false;
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    this.stopMockEvents();
    this.mockConnected = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 订阅消息类型
   */
  subscribe(type: WSMessageType | 'all', handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: WSMessage): void {
    // 触发特定类型的处理器
    const typeHandlers = this.messageHandlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => handler(message));
    }

    // 触发通用处理器
    const allHandlers = this.messageHandlers.get('all');
    if (allHandlers) {
      allHandlers.forEach(handler => handler(message));
    }
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
        }
      }
    }, this.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 计划重连（指数退避）
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // 指数退避：1s, 2s, 4s, 8s, 10s (max)
    const delays = [1000, 2000, 4000, 8000];
    const delay = delays[Math.min(this.reconnectAttempt, delays.length - 1)] || this.maxReconnectDelay;
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt + 1})`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempt++;
      this.connect();
    }, delay);
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    if (USE_MOCK) return this.mockConnected;
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private startMockEvents(): void {
    this.stopMockEvents();
    this.mockTimer = window.setInterval(() => {
      const event = mockNextEvent();
      if (event) this.handleMessage(event);
    }, 6000);
  }

  private stopMockEvents(): void {
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
  }
}

// 导出单例
export const wsService = new WebSocketService();
