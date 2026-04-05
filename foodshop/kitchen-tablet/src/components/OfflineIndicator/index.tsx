import React from 'react';

interface OfflineIndicatorProps {
  isOffline: boolean;
  reconnectAttempt?: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOffline,
  reconnectAttempt = 0,
}) => {
  if (!isOffline) return null;

  return (
    <div className="offline-overlay">
      <div className="bg-white rounded-lg shadow-2xl p-6 text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <div className="text-2xl font-bold text-red-600 mb-2">
          网络已断开
        </div>
        <div className="text-gray-600 mb-4">
          正在尝试重新连接...
        </div>
        {reconnectAttempt > 0 && (
          <div className="text-sm text-gray-500">
            重连次数: {reconnectAttempt}
          </div>
        )}
        <div className="mt-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    </div>
  );
};
