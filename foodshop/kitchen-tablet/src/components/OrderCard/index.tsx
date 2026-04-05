import React from 'react';
import type { Order, OrderState } from '@/types';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
}

const stateStyleMap: Record<
  OrderState,
  {
    card: string;
    badge: string;
    badgeText: string;
    line: string;
  }
> = {
  queued: {
    card: 'bg-amber-50 border-amber-300',
    badge: 'bg-amber-100',
    badgeText: 'text-amber-800',
    line: 'bg-amber-500',
  },
  cooking: {
    card: 'bg-sky-50 border-sky-300',
    badge: 'bg-sky-100',
    badgeText: 'text-sky-800',
    line: 'bg-sky-500',
  },
  ready: {
    card: 'bg-emerald-50 border-emerald-300',
    badge: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    line: 'bg-emerald-500',
  },
  served: {
    card: 'bg-slate-50 border-slate-300',
    badge: 'bg-slate-200',
    badgeText: 'text-slate-700',
    line: 'bg-slate-500',
  },
};

// 状态文本映射
const stateTextMap: Record<OrderState, string> = {
  queued: '排队中',
  cooking: '制作中',
  ready: '即将上桌',
  served: '已上桌',
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, onClick }) => {
  const styles = stateStyleMap[order.current_state];
  const stateText = stateTextMap[order.current_state];
  const hasUrge = order.urge_requested;

  return (
    <button
      type="button"
      className={`
        order-card
        relative w-full text-left rounded-xl p-4 cursor-pointer border-l-4 focus:outline-none focus:ring-2 focus:ring-sky-500/50
        ${styles.card}
        ${hasUrge ? 'border-2 border-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.2)] urge-blink' : 'border'}
      `}
      onClick={onClick}
    >
      <div className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${styles.line}`} />

      {/* 催单标记 */}
      {hasUrge && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow">
          催单 {order.urge_count && order.urge_count > 1 ? `×${order.urge_count}` : ''}
        </div>
      )}

      {/* 订单头部 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-2xl font-bold text-slate-900">
            桌号 {order.table_id}
          </div>
          <div className="text-sm text-slate-600">
            #{order.order_id.slice(-8)}
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full font-bold ${styles.badge} ${styles.badgeText}`}>
          {stateText}
        </div>
      </div>

      {/* 菜品列表 */}
      <div className="space-y-1 mb-3">
        {order.items.slice(0, 3).map((item) => (
          <div key={item.item_id} className="flex justify-between text-sm">
            <span className="text-slate-700">{item.dish_name}</span>
            <span className="text-slate-600">×{item.qty}</span>
          </div>
        ))}
        {order.items.length > 3 && (
          <div className="text-xs text-slate-600">
            还有 {order.items.length - 3} 道菜...
          </div>
        )}
      </div>

      {/* 时间信息 */}
      <div className="text-xs text-slate-600">
        下单时间: {new Date(order.created_at).toLocaleTimeString('zh-CN')}
      </div>
    </button>
  );
};
