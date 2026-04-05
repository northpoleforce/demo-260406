import { useEffect, useMemo, useState } from 'react';
import { apiService } from '@/services/api';
import type { Order } from '@/types';

type MenuItem = {
  id: string;
  name: string;
  price: number;
};

const MENU: MenuItem[] = [
  { id: 'm1', name: '宫保鸡丁', price: 38 },
  { id: 'm2', name: '鱼香肉丝', price: 36 },
  { id: 'm3', name: '麻婆豆腐', price: 22 },
  { id: 'm4', name: '番茄炒蛋', price: 20 },
  { id: 'm5', name: '米饭', price: 3 },
];

const STATE_TEXT: Record<string, string> = {
  queued: '排队中',
  cooking: '制作中',
  ready: '即将上桌',
  served: '已上桌',
};

function getTableId(): string {
  const p = new URLSearchParams(window.location.search);
  return p.get('table') || 'A1';
}

export function TableApp() {
  const [tableId] = useState(getTableId());
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const total = useMemo(() => {
    return MENU.reduce((sum, item) => sum + (cart[item.id] || 0) * item.price, 0);
  }, [cart]);

  const hasItems = useMemo(() => Object.values(cart).some((v) => v > 0), [cart]);

  async function loadOrders() {
    const res = await apiService.getSnapshot();
    if (!res.success || !res.data) return;
    setOrders(res.data.orders.filter((o) => o.table_id === tableId));
  }

  useEffect(() => {
    loadOrders();
    const timer = window.setInterval(loadOrders, 3000);
    return () => clearInterval(timer);
  }, [tableId]);

  const addOne = (id: string) => setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const minusOne = (id: string) =>
    setCart((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));

  async function submitOrder() {
    if (!hasItems) return;
    setSubmitting(true);
    setMessage('');
    const items = MENU.filter((m) => (cart[m.id] || 0) > 0).map((m) => ({
      dish_name: m.name,
      qty: cart[m.id],
    }));
    const res = await apiService.createOrder({ table_id: tableId, items });
    if (res.success) {
      setCart({});
      setMessage('下单成功，后厨已接单');
      await loadOrders();
    } else {
      setMessage(`下单失败：${res.error?.message || '未知错误'}`);
    }
    setSubmitting(false);
  }

  async function urgeLatestOrder() {
    if (orders.length === 0) return;
    const latest = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const res = await apiService.submitUrge(latest.order_id, { source: 'manual' });
    if (res.success) {
      setMessage('已催单，后厨会优先处理');
      await loadOrders();
    } else {
      setMessage(`催单失败：${res.error?.message || '未知错误'}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-white p-4 shadow flex items-center justify-between">
        <h1 className="text-xl font-bold">桌牌点餐 · 桌号 {tableId}</h1>
        <a className="text-sm text-blue-600" href="/">
          后厨看板
        </a>
      </header>

      <main className="max-w-4xl mx-auto p-4 grid md:grid-cols-2 gap-4">
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">菜单</h2>
          <div className="space-y-3">
            {MENU.map((item) => (
              <div key={item.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">¥{item.price}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="touch-button px-3 py-1 bg-gray-200 rounded" onClick={() => minusOne(item.id)}>
                    -
                  </button>
                  <span className="w-6 text-center">{cart[item.id] || 0}</span>
                  <button className="touch-button px-3 py-1 bg-blue-500 text-white rounded" onClick={() => addOne(item.id)}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="font-semibold">合计：¥{total}</div>
            <button
              className={`touch-button px-4 py-2 rounded text-white ${hasItems ? 'bg-green-600' : 'bg-gray-400'}`}
              disabled={!hasItems || submitting}
              onClick={submitOrder}
            >
              {submitting ? '提交中...' : '确认下单'}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">本桌订单进度</h2>
          <div className="space-y-2 max-h-80 overflow-auto">
            {orders.length === 0 ? (
              <div className="text-gray-500 text-sm">暂无订单</div>
            ) : (
              orders
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map((o) => (
                  <div key={o.order_id} className="border rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">订单 {o.order_id}</div>
                      <div className="text-sm">{STATE_TEXT[o.current_state] || o.current_state}</div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {o.items.map((i) => `${i.dish_name} x${i.qty}`).join('，')}
                    </div>
                  </div>
                ))
            )}
          </div>
          <button className="touch-button mt-4 w-full py-2 bg-red-500 text-white rounded" onClick={urgeLatestOrder}>
            语音不可用时一键催单
          </button>
          {message && <div className="mt-3 text-sm text-blue-700">{message}</div>}
        </section>
      </main>
    </div>
  );
}
