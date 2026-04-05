import React, { useState } from 'react';
import { Modal } from 'antd';
import type { OrderState } from '@/types';
import { OrderState as OrderStateEnum } from '@/types';

interface StatusButtonProps {
  currentState: OrderState;
  onStateChange: (newState: OrderState) => Promise<boolean>;
  confirmBeforeAction: boolean;
}

// 状态流转映射
const stateTransitions: Record<OrderState, OrderState | null> = {
  [OrderStateEnum.QUEUED]: OrderStateEnum.COOKING,
  [OrderStateEnum.COOKING]: OrderStateEnum.READY,
  [OrderStateEnum.READY]: OrderStateEnum.SERVED,
  [OrderStateEnum.SERVED]: null, // 已上桌没有下一步
};

// 按钮文本映射
const buttonTextMap: Record<OrderState, string> = {
  [OrderStateEnum.QUEUED]: '开始制作',
  [OrderStateEnum.COOKING]: '制作完成',
  [OrderStateEnum.READY]: '已上桌',
  [OrderStateEnum.SERVED]: '完成',
};

export const StatusButton: React.FC<StatusButtonProps> = ({
  currentState,
  onStateChange,
  confirmBeforeAction,
}) => {
  const [loading, setLoading] = useState(false);
  const [modal, contextHolder] = Modal.useModal();

  const nextState = stateTransitions[currentState];
  const buttonText = buttonTextMap[currentState];

  // 如果没有下一步状态，禁用按钮
  if (!nextState) {
    return (
      <button
        className="touch-button w-full py-3 px-6 bg-gray-300 text-gray-500 rounded-lg font-bold text-lg cursor-not-allowed"
        disabled
      >
        {buttonText}
      </button>
    );
  }

  const handleClick = async () => {
    if (confirmBeforeAction) {
      // 显示确认对话框
      modal.confirm({
        title: '确认操作',
        content: `确定要将状态改为"${buttonTextMap[nextState]}"吗？`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          await performStateChange();
        },
      });
    } else {
      // 直接执行
      await performStateChange();
    }
  };

  const performStateChange = async () => {
    setLoading(true);
    try {
      const success = await onStateChange(nextState);
      if (!success) {
        modal.error({
          title: '操作失败',
          content: '状态更新失败，请重试',
        });
      }
    } catch (error) {
      console.error('State change error:', error);
      modal.error({
        title: '操作失败',
        content: '网络错误，请检查连接后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <button
        className={`
          touch-button w-full py-3 px-6 rounded-lg font-bold text-lg text-white
          ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}
        `}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? '处理中...' : buttonText}
      </button>
    </>
  );
};
