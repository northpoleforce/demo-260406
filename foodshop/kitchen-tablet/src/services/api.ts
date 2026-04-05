import type {
  ApiResponse,
  Order,
  StateChangeRequest,
  ItemStateChangeRequest,
  UrgeRequest,
  SnapshotData,
  CreateOrderRequest,
} from '@/types';
import {
  mockCreateOrder,
  mockGetSnapshot,
  mockHealthCheck,
  mockUpdateOrderItemState,
  mockSubmitUrge,
  mockUpdateOrderState,
} from '@/mocks/mockBackend';

// API 配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEVICE_TOKEN = import.meta.env.VITE_DEVICE_TOKEN || 'kitchen-tablet-001';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

class ApiService {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string = API_BASE_URL, token: string = DEVICE_TOKEN) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    if (USE_MOCK) {
      return this.mockRequest<T>(endpoint, options);
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: errorData.message || `HTTP ${response.status}`,
          },
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  private async mockRequest<T>(endpoint: string, options: RequestInit): Promise<ApiResponse<T>> {
    const parseBody = <U>() => {
      try {
        return JSON.parse((options.body as string) || '{}') as U;
      } catch {
        return null;
      }
    };

    const method = (options.method || 'GET').toUpperCase();
    const stateMatch = endpoint.match(/^\/api\/v1\/orders\/([^/]+)\/state$/);
    const itemStateMatch = endpoint.match(/^\/api\/v1\/orders\/([^/]+)\/items\/([^/]+)\/state$/);
    const urgeMatch = endpoint.match(/^\/api\/v1\/orders\/([^/]+)\/urge$/);

    if (method === 'GET' && endpoint.startsWith('/api/v1/snapshot')) {
      return (await mockGetSnapshot()) as ApiResponse<T>;
    }
    if (method === 'GET' && endpoint === '/api/v1/health') {
      return (await mockHealthCheck()) as ApiResponse<T>;
    }
    if (method === 'POST' && stateMatch) {
      const request = parseBody<StateChangeRequest>();
      if (!request) return { success: false, error: { code: '400', message: 'Invalid request payload' } };
      return (await mockUpdateOrderState(stateMatch[1], request)) as ApiResponse<T>;
    }
    if (method === 'POST' && itemStateMatch) {
      const request = parseBody<ItemStateChangeRequest>();
      if (!request) return { success: false, error: { code: '400', message: 'Invalid request payload' } };
      return (await mockUpdateOrderItemState(itemStateMatch[1], itemStateMatch[2], request)) as ApiResponse<T>;
    }
    if (method === 'POST' && endpoint === '/api/v1/orders') {
      const request = parseBody<CreateOrderRequest>();
      if (!request) return { success: false, error: { code: '400', message: 'Invalid request payload' } };
      return (await mockCreateOrder(request)) as ApiResponse<T>;
    }
    if (method === 'POST' && urgeMatch) {
      const request = parseBody<UrgeRequest>();
      if (!request) return { success: false, error: { code: '400', message: 'Invalid request payload' } };
      return (await mockSubmitUrge(urgeMatch[1], request)) as ApiResponse<T>;
    }

    return {
      success: false,
      error: { code: '501', message: `Mock route not implemented: ${method} ${endpoint}` },
    };
  }

  /**
   * 更新订单状态
   */
  async updateOrderState(
    orderId: string,
    request: StateChangeRequest
  ): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/api/v1/orders/${orderId}/state`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateOrderItemState(
    orderId: string,
    itemId: string,
    request: ItemStateChangeRequest
  ): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/api/v1/orders/${orderId}/items/${itemId}/state`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * 提交催单
   */
  async submitUrge(
    orderId: string,
    request: UrgeRequest
  ): Promise<ApiResponse<{ accepted: boolean; reason?: string }>> {
    return this.request(`/api/v1/orders/${orderId}/urge`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * 获取快照数据
   */
  async getSnapshot(since?: string): Promise<ApiResponse<SnapshotData>> {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    return this.request<SnapshotData>(`/api/v1/snapshot${query}`, {
      method: 'GET',
    });
  }

  async createOrder(request: CreateOrderRequest): Promise<ApiResponse<Order>> {
    return this.request<Order>('/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.request('/api/v1/health', {
      method: 'GET',
    });
  }
}

// 导出单例
export const apiService = new ApiService();
