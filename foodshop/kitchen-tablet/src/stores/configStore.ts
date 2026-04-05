import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Config, SortMode } from '@/types';

interface ConfigStore extends Config {
  setConfirmBeforeAction: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setSortMode: (mode: SortMode) => void;
  muteFor: (minutes: number) => void;
  unmute: () => void;
  isMuted: () => boolean;
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      // 默认配置
      confirm_before_action: false,
      sound_enabled: true,
      sound_volume: 0.8,
      sort_mode: 'time',
      mute_until: undefined,

      // 设置操作前二次确认
      setConfirmBeforeAction: (enabled) => {
        set({ confirm_before_action: enabled });
      },

      // 设置声音提醒开关
      setSoundEnabled: (enabled) => {
        set({ sound_enabled: enabled });
      },

      // 设置音量
      setSoundVolume: (volume) => {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        set({ sound_volume: clampedVolume });
      },

      // 设置排序模式
      setSortMode: (mode) => {
        set({ sort_mode: mode });
      },

      // 静音指定分钟数
      muteFor: (minutes) => {
        const muteUntil = Date.now() + minutes * 60 * 1000;
        set({ mute_until: muteUntil });
      },

      // 取消静音
      unmute: () => {
        set({ mute_until: undefined });
      },

      // 检查是否处于静音状态
      isMuted: () => {
        const { mute_until } = get();
        if (!mute_until) return false;
        
        if (Date.now() > mute_until) {
          // 静音时间已过，自动取消静音
          set({ mute_until: undefined });
          return false;
        }
        
        return true;
      },
    }),
    {
      name: 'kitchen-config-storage',
    }
  )
);
