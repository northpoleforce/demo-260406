import {
  OrderState,
  WSMessageType,
  type ApiResponse,
  type Order,
  type SnapshotData,
  type CreateOrderRequest,
  type ItemStateChangeRequest,
  type StateChangeRequest,
  type UrgeRequest,
  type UrgeEvent,
  type WSMessage,
} from '@/types';

const now = () => new Date().toISOString();

const initialOrders: Order[] = [
  {
    order_id: 'ORD-1001',
    table_id: 'A1',
    created_at: now(),
    updated_at: now(),
    current_state: OrderState.QUEUED,
    version: 1,
    items: [
      { item_id: 'I-1', order_id: 'ORD-1001', dish_name: '宫保鸡丁', qty: 1, item_state: OrderState.QUEUED },
      { item_id: 'I-2', order_id: 'ORD-1001', dish_name: '米饭', qty: 2, item_state: OrderState.QUEUED },
    ],
  },
  {
    order_id: 'ORD-1002',
    table_id: 'B3',
    created_at: now(),
    updated_at: now(),
    current_state: OrderState.COOKING,
    version: 2,
    items: [{ item_id: 'I-3', order_id: 'ORD-1002', dish_name: '鱼香肉丝', qty: 1, item_state: OrderState.COOKING }],
  },
  {
    order_id: 'ORD-1003',
    table_id: 'C2',
    created_at: now(),
    updated_at: now(),
    current_state: OrderState.READY,
    version: 3,
    items: [{ item_id: 'I-4', order_id: 'ORD-1003', dish_name: '番茄炒蛋', qty: 1, item_state: OrderState.READY }],
  },
];

let orders: Order[] = structuredClone(initialOrders);

const validNextState: Record<OrderState, OrderState | null> = {
  [OrderState.QUEUED]: OrderState.COOKING,
  [OrderState.COOKING]: OrderState.READY,
  [OrderState.READY]: OrderState.SERVED,
  [OrderState.SERVED]: null,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockGetSnapshot(): Promise<ApiResponse<SnapshotData>> {
  await sleep(120);
  return {
    success: true,
    data: {
      orders: structuredClone(orders),
      timestamp: now(),
      is_full: true,
    },
  };
}

export async function mockUpdateOrderState(
  orderId: string,
  request: StateChangeRequest
): Promise<ApiResponse<Order>> {
  await sleep(120);
  const idx = orders.findIndex((o) => o.order_id === orderId);
  if (idx < 0) {
    return { success: false, error: { code: '404', message: 'Order not found' } };
  }

  const order = orders[idx];
  if (order.version !== request.version) {
    return { success: false, error: { code: '409', message: 'Version conflict' } };
  }

  if (validNextState[order.current_state] !== request.target_state) {
    return { success: false, error: { code: '409', message: 'Invalid state transition' } };
  }

  const updated: Order = {
    ...order,
    current_state: request.target_state,
    updated_at: now(),
    version: order.version + 1,
  };
  orders[idx] = updated;
  return { success: true, data: structuredClone(updated) };
}

export async function mockUpdateOrderItemState(
  orderId: string,
  itemId: string,
  request: ItemStateChangeRequest
): Promise<ApiResponse<Order>> {
  await sleep(120);
  const idx = orders.findIndex((o) => o.order_id === orderId);
  if (idx < 0) return { success: false, error: { code: '404', message: 'Order not found' } };
  const order = orders[idx];
  const item = order.items.find((i) => i.item_id === itemId);
  if (!item) return { success: false, error: { code: '404', message: 'Item not found' } };

  if (validNextState[item.item_state] !== request.target_state) {
    return { success: false, error: { code: '409', message: 'Invalid item transition' } };
  }

  const updatedItems = order.items.map((i) =>
    i.item_id === itemId ? { ...i, item_state: request.target_state } : i
  );
  const states = updatedItems.map((i) => i.item_state);
  let nextOrderState: OrderState = OrderState.SERVED;
  if (states.includes(OrderState.COOKING)) nextOrderState = OrderState.COOKING;
  else if (states.includes(OrderState.QUEUED)) nextOrderState = OrderState.QUEUED;
  else if (states.includes(OrderState.READY)) nextOrderState = OrderState.READY;

  const updated: Order = {
    ...order,
    items: updatedItems,
    current_state: nextOrderState,
    version: order.version + 1,
    updated_at: now(),
  };
  orders[idx] = updated;
  return { success: true, data: structuredClone(updated) };
}

export async function mockSubmitUrge(
  orderId: string,
  _request: UrgeRequest
): Promise<ApiResponse<{ accepted: boolean; reason?: string }>> {
  await sleep(100);
  const idx = orders.findIndex((o) => o.order_id === orderId);
  if (idx < 0) {
    return { success: false, error: { code: '404', message: 'Order not found' } };
  }
  orders[idx] = {
    ...orders[idx],
    urge_requested: true,
    urge_count: (orders[idx].urge_count ?? 0) + 1,
    updated_at: now(),
  };
  return { success: true, data: { accepted: true } };
}

export async function mockHealthCheck(): Promise<ApiResponse<{ status: string }>> {
  await sleep(60);
  return { success: true, data: { status: 'ok(mock)' } };
}

export async function mockCreateOrder(request: CreateOrderRequest): Promise<ApiResponse<Order>> {
  await sleep(120);
  const orderId = `ORD-${Math.floor(Math.random() * 9000 + 1000)}`;
  const created: Order = {
    order_id: orderId,
    table_id: request.table_id,
    created_at: now(),
    updated_at: now(),
    current_state: OrderState.QUEUED,
    version: 1,
    items: request.items.map((item, idx) => ({
      item_id: `I-${orderId}-${idx + 1}`,
      order_id: orderId,
      dish_name: item.dish_name,
      qty: item.qty,
      item_state: OrderState.QUEUED,
    })),
    urge_requested: false,
    urge_count: 0,
  };
  orders = [created, ...orders];
  return { success: true, data: structuredClone(created) };
}

export function mockNextEvent(): WSMessage | null {
  if (orders.length === 0) return null;
  const order = orders[Math.floor(Math.random() * orders.length)];
  const eventId = `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // 30% 概率触发催单
  if (Math.random() < 0.3 && order.current_state !== OrderState.SERVED) {
    const urge: UrgeEvent = {
      event_id: eventId,
      order_id: order.order_id,
      table_id: order.table_id,
      source: 'voice',
      confidence: 0.9,
      request_id: `req-${eventId}`,
      created_at: now(),
    };

    const updatedOrder: Order = {
      ...order,
      urge_requested: true,
      urge_count: (order.urge_count ?? 0) + 1,
      updated_at: now(),
    };
    orders = orders.map((o) => (o.order_id === order.order_id ? updatedOrder : o));

    return {
      type: WSMessageType.URGE_CREATED,
      event_id: eventId,
      timestamp: now(),
      data: { urge, order: structuredClone(updatedOrder) },
    };
  }

  const next = validNextState[order.current_state];
  if (!next) return null;
  const updatedOrder: Order = {
    ...order,
    current_state: next,
    version: order.version + 1,
    updated_at: now(),
  };
  orders = orders.map((o) => (o.order_id === order.order_id ? updatedOrder : o));

  return {
    type: WSMessageType.ORDER_UPDATED,
    event_id: eventId,
    timestamp: now(),
    data: { order: structuredClone(updatedOrder) },
  };
}
