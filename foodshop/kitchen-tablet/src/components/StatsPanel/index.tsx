import React, { useEffect } from 'react';
import { useStatsStore } from '@/stores/statsStore';

export const StatsPanel: React.FC = () => {
  const {
    today_completed,
    in_progress,
    avg_cooking_time,
    urge_response_rate,
    total_urges,
    lastUpdated,
    updateStats,
    startAutoRefresh,
    stopAutoRefresh,
  } = useStatsStore();

  useEffect(() => {
    // 启动自动刷新（30秒）
    startAutoRefresh(30000);

    return () => {
      stopAutoRefresh();
    };
  }, [startAutoRefresh, stopAutoRefresh]);

  // 格式化时间（秒转分秒）
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">实时统计</h2>
        {lastUpdated && (
          <div className="text-xs text-slate-500">
            更新于 {new Date(lastUpdated).toLocaleTimeString('zh-CN')}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 今日完成 */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="text-sm text-slate-600">今日完成</div>
          <div className="text-3xl font-bold text-emerald-700">
            {today_completed}
          </div>
          <div className="text-xs text-slate-600">单</div>
        </div>

        {/* 进行中 */}
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
          <div className="text-sm text-slate-600">进行中</div>
          <div className="text-3xl font-bold text-sky-700">
            {in_progress}
          </div>
          <div className="text-xs text-slate-600">单</div>
        </div>

        {/* 平均出餐时间 */}
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
          <div className="text-sm text-slate-600">平均出餐</div>
          <div className="text-2xl font-bold text-violet-700">
            {avg_cooking_time > 0 ? formatTime(avg_cooking_time) : '--'}
          </div>
        </div>

        {/* 催单统计 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-sm text-slate-600">今日催单</div>
          <div className="text-3xl font-bold text-amber-700">
            {total_urges}
          </div>
          <div className="text-xs text-slate-600">次</div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
        <div className="text-sm text-slate-600">催单响应率</div>
        <div className="text-2xl font-bold text-indigo-700">
          {urge_response_rate}%
        </div>
      </div>

      {/* 手动刷新按钮 */}
      <button
        className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm text-slate-700 transition-colors"
        onClick={updateStats}
      >
        🔄 手动刷新
      </button>
    </div>
  );
};
