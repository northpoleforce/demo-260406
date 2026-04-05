import React, { useEffect } from 'react';
import type { UrgeEvent, Order } from '@/types';
import { audioService } from '@/services/audio';
import { useConfigStore } from '@/stores/configStore';

interface UrgeAlertProps {
  urge: UrgeEvent;
  order: Order;
  onClose: () => void;
}

export const UrgeAlert: React.FC<UrgeAlertProps> = ({ urge, order, onClose }) => {
  const { sound_enabled, sound_volume, isMuted } = useConfigStore();

  useEffect(() => {
    // 播放声音（如果启用且未静音）
    if (sound_enabled && !isMuted()) {
      audioService.playUrgeBeep(sound_volume);
    }

    // 5秒后自动关闭
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => {
      clearTimeout(timer);
      audioService.stop();
    };
  }, [sound_enabled, sound_volume, isMuted, onClose]);

  return (
    <div
      className="urge-alert-card relative overflow-hidden border-2 border-red-300 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white rounded-xl shadow-[0_12px_30px_rgba(239,68,68,0.45)] p-4 min-w-[320px] max-w-[420px] cursor-pointer"
      onClick={onClose}
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-yellow-300" />
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/20" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xl font-extrabold tracking-wide">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-600">!</span>
          <span>催单提醒</span>
        </div>
        <button
          className="text-white/90 hover:text-white text-2xl leading-none font-bold"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          ×
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xl font-extrabold">
          桌号 {urge.table_id} 正在催单
        </div>
        
        <div className="text-sm text-white/95">
          订单号: #{order.order_id.slice(-8)}
        </div>

        <div className="text-sm text-white/95">
          {order.items.length} 道菜
        </div>

        {urge.source === 'voice' && urge.confidence && (
          <div className="inline-flex items-center rounded-full bg-white/20 px-2 py-1 text-xs font-semibold text-white">
            语音识别置信度: {(urge.confidence * 100).toFixed(0)}%
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-white/90 font-medium">
        点击关闭 · {new Date(urge.created_at).toLocaleTimeString('zh-CN')}
      </div>
    </div>
  );
};

// 催单提醒管理器组件
interface UrgeAlertManagerProps {
  urges: Array<{ urge: UrgeEvent; order: Order }>;
  onDismiss: (urgeId: string) => void;
}

export const UrgeAlertManager: React.FC<UrgeAlertManagerProps> = ({
  urges,
  onDismiss,
}) => {
  return (
    <div className="fixed top-0 right-0 z-[9999] pointer-events-none">
      <div className="pointer-events-auto space-y-3 p-4">
        {urges.map(({ urge, order }, index) => (
          <div
            key={urge.event_id}
            className="animate-[slideInAlert_220ms_ease-out]"
            style={{ transform: `translateY(${index * 8}px)` }}
          >
            <UrgeAlert
              urge={urge}
              order={order}
              onClose={() => onDismiss(urge.event_id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
