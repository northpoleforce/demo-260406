import React, { useEffect, useMemo, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useOrderStore } from '@/stores/orderStore';
import type { Order, OrderItem, OrderState } from '@/types';

const ITEM_LABEL: Record<string, string> = {
  queued: '排队中',
  cooking: '制作中',
  ready: '派送中',
  served: '已送达',
};

const ITEM_STYLE: Record<string, string> = {
  queued: 'bg-amber-100 text-amber-800 border-amber-300',
  cooking: 'bg-sky-100 text-sky-800 border-sky-300',
  ready: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  served: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

const NEXT_STATE: Record<string, OrderState | null> = {
  queued: 'cooking' as OrderState,
  cooking: 'ready' as OrderState,
  ready: 'served' as OrderState,
  served: null,
};

const PRIORITY: Record<string, number> = {
  cooking: 0,
  queued: 1,
  ready: 2,
  served: 3,
};

function allServed(order: Order): boolean {
  return order.items.length > 0 && order.items.every((i) => i.item_state === ('served' as OrderState));
}

function orderPriority(order: Order): number {
  if (order.items.length === 0) return 99;
  return Math.min(...order.items.map((i) => PRIORITY[i.item_state] ?? 99));
}

function sortUrgeOrders(input: Order[]): Order[] {
  return [...input].sort((a, b) => {
    const urgeDiff = (b.urge_count ?? 0) - (a.urge_count ?? 0);
    if (urgeDiff !== 0) return urgeDiff;
    const p = orderPriority(a) - orderPriority(b);
    if (p !== 0) return p;
    const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (t !== 0) return t;
    return a.table_id.localeCompare(b.table_id, 'zh-CN');
  });
}

function sortNormalOrders(input: Order[]): Order[] {
  return [...input].sort((a, b) => {
    const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (t !== 0) return t;
    return a.table_id.localeCompare(b.table_id, 'zh-CN');
  });
}

function sortItems(input: OrderItem[]): OrderItem[] {
  return [...input].sort((a, b) => {
    const p = (PRIORITY[a.item_state] ?? 99) - (PRIORITY[b.item_state] ?? 99);
    if (p !== 0) return p;
    return a.dish_name.localeCompare(b.dish_name, 'zh-CN');
  });
}

interface OrderRowProps {
  order: Order;
  fading: boolean;
  onClickItem: (order: Order, item: OrderItem) => void;
}

const OrderRow: React.FC<OrderRowProps> = ({ order, onClickItem, fading }) => {
  const sortedItems = useMemo(() => sortItems(order.items), [order.items]);

  return (
    <div
      className={`max-h-[1000px] overflow-hidden rounded-xl border bg-white p-3 transition-all duration-500 ${
        order.urge_requested ? 'border-red-300 shadow-[0_0_0_2px_rgba(239,68,68,0.12)]' : 'border-slate-200'
      } ${fading ? 'order-fade-out' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-[120px]">
          <div className="text-lg font-bold text-slate-900">桌号 {order.table_id}</div>
          <div className="text-xs text-slate-500">#{order.order_id.slice(-8)}</div>
          <div className="mt-1 text-xs text-slate-500">{new Date(order.created_at).toLocaleTimeString('zh-CN')}</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {sortedItems.map((item) => (
              <button
                key={item.item_id}
                type="button"
                onClick={() => onClickItem(order, item)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm ${
                  ITEM_STYLE[item.item_state] || 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
                title="点击进入下一个状态"
              >
                {item.dish_name} ×{item.qty} · {ITEM_LABEL[item.item_state] || item.item_state}
              </button>
            ))}
          </div>
        </div>

        {order.urge_requested && (
          <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
            催单 {order.urge_count && order.urge_count > 1 ? `×${order.urge_count}` : ''}
          </span>
        )}
      </div>
    </div>
  );
};

export const OrderBoard: React.FC = () => {
  const { getSortedOrders, changeOrderItemState } = useOrderStore();
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [urgeListRef] = useAutoAnimate<HTMLDivElement>();
  const [normalListRef] = useAutoAnimate<HTMLDivElement>();

  const orders = getSortedOrders('time').filter((o) => !hiddenIds.has(o.order_id));
  const shouldRender = (o: Order) => !allServed(o) || fadingIds.has(o.order_id);
  const urgePendingCount = useMemo(() => orders.filter((o) => o.urge_requested && !allServed(o)).length, [orders]);
  const normalPendingCount = useMemo(() => orders.filter((o) => !o.urge_requested && !allServed(o)).length, [orders]);
  const urgeOrders = useMemo(() => sortUrgeOrders(orders.filter((o) => o.urge_requested && shouldRender(o))), [orders, fadingIds]);
  const normalOrders = useMemo(
    () => sortNormalOrders(orders.filter((o) => !o.urge_requested && shouldRender(o))),
    [orders, fadingIds]
  );

  useEffect(() => {
    const newlyServed = orders.filter((o) => allServed(o) && !hiddenIds.has(o.order_id) && !fadingIds.has(o.order_id));
    if (newlyServed.length === 0) return;

    setFadingIds((prev) => {
      const next = new Set(prev);
      newlyServed.forEach((o) => next.add(o.order_id));
      return next;
    });

    const timer = window.setTimeout(() => {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        newlyServed.forEach((o) => next.add(o.order_id));
        return next;
      });
      setFadingIds((prev) => {
        const next = new Set(prev);
        newlyServed.forEach((o) => next.delete(o.order_id));
        return next;
      });
    }, 520);

    return () => clearTimeout(timer);
  }, [orders, hiddenIds, fadingIds]);

  const handleClickItem = async (order: Order, item: OrderItem) => {
    const next = NEXT_STATE[item.item_state];
    if (!next) return;

    const success = await changeOrderItemState(order.order_id, item.item_id, next, 'kitchen-operator');
    if (!success) return;
  };

  if (urgeOrders.length === 0 && normalOrders.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-xl">暂无进行中订单</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-5">
        <section className="rounded-xl border border-red-200 bg-red-50/40 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-red-700">催单区</h3>
            <span className="text-xs rounded-full bg-red-600 text-white px-2 py-1">{urgePendingCount} 单</span>
          </div>
          <div ref={urgeListRef} className="space-y-2">
            {urgeOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-red-200 bg-white/70 p-3 text-sm text-slate-500">当前无催单订单</div>
            ) : (
              urgeOrders.map((order) => (
                <OrderRow key={order.order_id} order={order} fading={fadingIds.has(order.order_id)} onClickItem={handleClickItem} />
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">普通区</h3>
            <span className="text-xs rounded-full bg-slate-700 text-white px-2 py-1">{normalPendingCount} 单</span>
          </div>
          <div ref={normalListRef} className="space-y-2">
            {normalOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">当前无普通订单</div>
            ) : (
              normalOrders.map((order) => (
                <OrderRow key={order.order_id} order={order} fading={fadingIds.has(order.order_id)} onClickItem={handleClickItem} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
