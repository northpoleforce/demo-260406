// 简单的蜂鸣音生成和播放服务
class AudioService {
  private audioContext: AudioContext | null = null;
  private currentGainNode: GainNode | null = null;
  private currentOscillator: OscillatorNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * 播放蜂鸣提示音（1.5秒）
   * @param volume 音量 (0-1)
   */
  playUrgeBeep(volume: number = 0.8): void {
    if (!this.audioContext) {
      console.warn('AudioContext not available');
      return;
    }

    // 停止之前的声音
    this.stop();

    const ctx = this.audioContext;
    
    // 创建振荡器（蜂鸣音）
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // 连接节点
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 设置频率（700Hz 蜂鸣音）
    oscillator.frequency.value = 700;
    oscillator.type = 'square';

    // 设置音量（带渐入渐出效果）
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.05);  // 渐入 50ms
    gainNode.gain.setValueAtTime(volume, now + 1.4);            // 持续 1.35s
    gainNode.gain.linearRampToValueAtTime(0, now + 1.5);        // 渐出 100ms

    // 开始播放
    oscillator.start(now);
    oscillator.stop(now + 1.5);

    // 保存引用用于停止
    this.currentOscillator = oscillator;
    this.currentGainNode = gainNode;

    // 播放完成后清理
    oscillator.onended = () => {
      this.cleanup();
    };
  }

  /**
   * 停止当前播放的声音
   */
  stop(): void {
    if (this.currentOscillator) {
      try {
        this.currentOscillator.stop();
      } catch (e) {
        // 忽略已经停止的错误
      }
    }
    this.cleanup();
  }

  /**
   * 清理音频节点
   */
  private cleanup(): void {
    if (this.currentOscillator) {
      this.currentOscillator.disconnect();
      this.currentOscillator = null;
    }
    if (this.currentGainNode) {
      this.currentGainNode.disconnect();
      this.currentGainNode = null;
    }
  }

  /**
   * 恢复 AudioContext（用于用户交互后激活）
   */
  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// 导出单例
export const audioService = new AudioService();
