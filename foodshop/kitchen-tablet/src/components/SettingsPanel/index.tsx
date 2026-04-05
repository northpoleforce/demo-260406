import React from 'react';
import { Switch, Slider } from 'antd';
import { useConfigStore } from '@/stores/configStore';

export const SettingsPanel: React.FC = () => {
  const {
    confirm_before_action,
    sound_enabled,
    sound_volume,
    mute_until,
    setConfirmBeforeAction,
    setSoundEnabled,
    setSoundVolume,
    muteFor,
    unmute,
    isMuted,
  } = useConfigStore();

  const mutedStatus = isMuted();
  const muteRemaining = mute_until ? Math.ceil((mute_until - Date.now()) / 60000) : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
      <h2 className="text-lg font-bold text-gray-800">设置</h2>

      {/* 二次确认 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-700">操作确认</div>
          <div className="text-xs text-gray-500">状态变更前需要确认</div>
        </div>
        <Switch
          checked={confirm_before_action}
          onChange={setConfirmBeforeAction}
        />
      </div>

      {/* 声音提醒 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-700">声音提醒</div>
          <div className="text-xs text-gray-500">催单时播放提示音</div>
        </div>
        <Switch
          checked={sound_enabled}
          onChange={setSoundEnabled}
        />
      </div>

      {/* 音量控制 */}
      {sound_enabled && (
        <div className="pl-4">
          <div className="text-sm text-gray-600 mb-2">音量</div>
          <Slider
            min={0}
            max={100}
            value={sound_volume * 100}
            onChange={(value) => setSoundVolume(value / 100)}
          />
        </div>
      )}

      {/* 静音控制 */}
      {sound_enabled && (
        <div className="border-t pt-3">
          <div className="text-sm font-medium text-gray-700 mb-2">临时静音</div>
          {mutedStatus ? (
            <div className="space-y-2">
              <div className="text-xs text-orange-600">
                静音中（剩余 {muteRemaining} 分钟）
              </div>
              <button
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                onClick={unmute}
              >
                取消静音
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                className="py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                onClick={() => muteFor(5)}
              >
                静音 5 分钟
              </button>
              <button
                className="py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                onClick={() => muteFor(30)}
              >
                静音 30 分钟
              </button>
            </div>
          )}
        </div>
      )}

      {/* 设备信息 */}
      <div className="border-t pt-3 text-xs text-gray-400 space-y-1">
        <div>设备类型: 后厨平板</div>
        <div>版本: v1.0.0</div>
      </div>
    </div>
  );
};
