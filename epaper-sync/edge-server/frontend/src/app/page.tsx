'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, DishRecord } from '@/lib/supabaseClient';
import { AppConfig } from '@/lib/config';
import styles from './page.module.css';
import Image from 'next/image';
import { prepare, layout } from '@chenglou/pretext';

// ─── 常量配置 ────────────────────────────────────────────────
const FONT_FAMILY = '"Noto Sans SC", sans-serif';

/** 图片加载超时时间（毫秒）—— 超时后使用 fallback */
const IMAGE_LOAD_TIMEOUT_MS = 8000;

/** 图片加载失败后的最大重试次数 */
const IMAGE_MAX_RETRIES = 3;

/** 重试间隔基数（毫秒），实际间隔 = base * 2^(retryCount) 指数退避 */
const IMAGE_RETRY_BASE_MS = 500;

/** 本地 fallback 占位图（确保 public/images/ 下存在） */
const FALLBACK_IMAGE = '/images/pet_mascot.png';

// ─── 工具函数 ────────────────────────────────────────────────

/** 验证图片 URL 是否可能有效 */
function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length < 5) return false;
  // 接受 http(s):// 和 / 开头的相对路径，以及 data: URI
  return /^(https?:\/\/|\/|data:image\/)/.test(trimmed);
}

/**
 * 预加载图片并返回可用的 blob URL，彻底绕过 Next.js Image 优化管线的不确定性。
 * - 使用 fetch + blob 将图片完整下载到内存
 * - 超时自动 reject
 * - 返回的 blob URL 是本地的，绝对不会再发网络请求
 */
function preloadImageToBlob(src: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Image preload timed out after ${timeoutMs}ms: ${src}`));
    }, timeoutMs);

    fetch(src, { signal: controller.signal, mode: 'cors', cache: 'force-cache' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${src}`);
        return res.blob();
      })
      .then(blob => {
        clearTimeout(timer);
        if (blob.size === 0) throw new Error('Empty blob received');
        const blobUrl = URL.createObjectURL(blob);
        resolve(blobUrl);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ─── 组件 ────────────────────────────────────────────────────

export default function Home() {
  const [currentDish, setCurrentDish] = useState<DishRecord | null>(null);
  
  // 图片状态机：idle → loading → loaded | error
  const [imageStatus, setImageStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  /** 实际渲染用的图片 src（可能是 blob URL 或 fallback） */
  const [resolvedImageSrc, setResolvedImageSrc] = useState<string>('');
  
  // 排版状态
  const [descFontSize, setDescFontSize] = useState(24);
  const [formattedText, setFormattedText] = useState('');
  const [isHeadless, setIsHeadless] = useState(false);
  const textAreaRef = useRef<HTMLDivElement>(null);
  const [boxDimensions, setBoxDimensions] = useState({ width: 0, height: 0 });

  // 用于取消正在进行的图片加载操作
  const imageLoadAbortRef = useRef<AbortController | null>(null);
  // 用于清理 blob URL 防止内存泄漏
  const prevBlobUrlRef = useRef<string>('');

  // ─── 图片预加载管线（带重试 + 超时 + 降级） ────────────────

  const loadImageWithRetry = useCallback(async (rawUrl: unknown) => {
    // 0. 取消上一次加载（如果还在进行中）
    if (imageLoadAbortRef.current) {
      imageLoadAbortRef.current.abort();
    }
    const abortController = new AbortController();
    imageLoadAbortRef.current = abortController;

    // 1. 清理上一个 blob URL
    if (prevBlobUrlRef.current) {
      URL.revokeObjectURL(prevBlobUrlRef.current);
      prevBlobUrlRef.current = '';
    }

    // 2. 校验 URL
    if (!isValidImageUrl(rawUrl)) {
      console.warn('[图片加载] ❌ 无效的图片 URL，直接使用 fallback:', rawUrl);
      setResolvedImageSrc(FALLBACK_IMAGE);
      setImageStatus('loaded'); // fallback 是本地的，视为已加载
      return;
    }

    const url = (rawUrl as string).trim();
    setImageStatus('loading');

    // 3. 指数退避重试
    for (let attempt = 0; attempt < IMAGE_MAX_RETRIES; attempt++) {
      if (abortController.signal.aborted) return; // 被新的加载取消了

      try {
        console.log(`[图片加载] 第 ${attempt + 1}/${IMAGE_MAX_RETRIES} 次尝试: ${url.slice(0, 80)}...`);
        const blobUrl = await preloadImageToBlob(url, IMAGE_LOAD_TIMEOUT_MS);

        if (abortController.signal.aborted) {
          // 加载完成了但已经被取消，清理 blob
          URL.revokeObjectURL(blobUrl);
          return;
        }

        prevBlobUrlRef.current = blobUrl;
        setResolvedImageSrc(blobUrl);
        setImageStatus('loaded');
        console.log(`[图片加载] ✅ 成功！(第 ${attempt + 1} 次)`);
        return;
      } catch (err) {
        console.warn(`[图片加载] 第 ${attempt + 1} 次失败:`, err);
        
        if (attempt < IMAGE_MAX_RETRIES - 1) {
          // 指数退避等待
          const delay = IMAGE_RETRY_BASE_MS * Math.pow(2, attempt);
          console.log(`[图片加载] 等待 ${delay}ms 后重试...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    // 4. 所有重试都失败了，降级到 fallback
    if (!abortController.signal.aborted) {
      console.error(`[图片加载] ❌ ${IMAGE_MAX_RETRIES} 次重试全部失败，使用 fallback`);
      setResolvedImageSrc(FALLBACK_IMAGE);
      setImageStatus('loaded'); // fallback 是本地的，视为已加载
    }
  }, []);

  // ─── 初始化 + 实时订阅 ────────────────────────────────────

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsHeadless(window.location.search.includes('headless=true'));
    }

    const tableName = AppConfig.supabase.tableName;

    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('[Supabase] 初始数据获取失败:', error);
          return;
        }

        if (data && data.length > 0) {
          const dish = data[0] as DishRecord;
          setCurrentDish(dish);
          loadImageWithRetry(dish[AppConfig.schema.imageUrlColumn as keyof DishRecord]);
        }
      } catch (err) {
        console.error('[Supabase] 网络异常:', err);
      }
    };
    fetchInitialData();

    const channel = supabase.channel('realtime:photo_text')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: tableName }, 
        (payload) => {
          const newRecord = payload.new as DishRecord;
          
          // 重置所有状态
          setFormattedText('');
          setImageStatus('idle');
          setResolvedImageSrc('');
          if (typeof window !== 'undefined') (window as any).__RENDER_READY__ = false;

          setCurrentDish(newRecord);
          loadImageWithRetry(newRecord[AppConfig.schema.imageUrlColumn as keyof DishRecord]);

          // Trigger backend rendering and MQTT notification
          fetch('http://localhost:3000/trigger', { method: 'GET', mode: 'no-cors' }).catch(err => {
            console.error('[MQTT Trigger] Failed:', err);
          });
        })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase] 实时监听已订阅:', tableName);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      // 清理 blob URL
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
    };
  }, [loadImageWithRetry]);

  // ─── 监控容器尺寸 ──────────────────────────────────────────

  useEffect(() => {
    if (!textAreaRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setBoxDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(textAreaRef.current);
    return () => observer.disconnect();
  }, []);

  // ─── Pretext 排版计算 ──────────────────────────────────────

  useEffect(() => {
    if (!currentDish || boxDimensions.width === 0 || boxDimensions.height === 0) return;
    
    const rawText = currentDish[AppConfig.schema.contentColumn as keyof DishRecord] as string || '';
    if (!rawText) return;

    const text = rawText
      .replace(/。/g, '。\n')
      .replace(/\.(?!\d)/g, '.\n')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    let minSize = 10;
    let maxSize = 80;
    let bestSize = 24;

    for (let test = 0; test < 15; test++) {
      if (minSize > maxSize) break;
      const mid = Math.floor((minSize + maxSize) / 2);
      try {
        const fontStr = `bold ${mid}px ${FONT_FAMILY}`; 
        const prepared = prepare(text, fontStr);
        const { height } = layout(prepared, boxDimensions.width, mid * 1.8);

        if (height <= boxDimensions.height) {
          bestSize = mid;
          minSize = mid + 1;
        } else {
          maxSize = mid - 1;
        }
      } catch (e) {
        console.error('[Pretext] 排版计算异常:', e);
        break;
      }
    }
    
    setFormattedText(text);
    setDescFontSize(bestSize);
  }, [currentDish, boxDimensions]);

  // ─── 截图就绪信号（双条件门控） ────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const textReady = formattedText.length > 0;
    const imgReady = imageStatus === 'loaded';

    if (!textReady || !imgReady) {
      (window as any).__RENDER_READY__ = false;
      return;
    }

    document.fonts.ready.then(() => {
      console.log('[前端就绪] ✅ 排版完毕 + 图片就绪 → 放行截图');
      setTimeout(() => {
        (window as any).__RENDER_READY__ = true;
      }, isHeadless ? 50 : 800);
    });

  }, [formattedText, imageStatus, isHeadless]);

  // ─── 渲染 ──────────────────────────────────────────────────

  const hasImage = resolvedImageSrc.length > 0;

  return (
    <main className={styles.main}>
      {/* Top Area: Logos (Left), Mascot (Center), Image (Right) */}
      <div className={styles.topArea}>
        <div className={styles.logoCard}>
          <div className={styles.logoRow}>
            <Image 
              src="/images/logo.png" 
              alt="Main Logo" 
              width={160}
              height={40}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <div className={styles.logoRow}>
            <Image 
              src="/images/drobotics_logo.png" 
              alt="Drobotics Logo" 
              width={200}
              height={50}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <div className={styles.logoRow}>
            <Image 
              src="/images/seeed_logo.webp" 
              alt="Seeed Logo" 
              width={80}
              height={30}
              style={{ objectFit: 'contain' }}
              priority
            />
            <Image 
              src="/images/rokid_logo.svg" 
              alt="Rokid Logo" 
              width={80}
              height={30}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        </div>

        <div className={styles.mascotCard}>
          <Image 
            src="/images/pet_mascot.png" 
            alt="Mascot" 
            fill
            className={styles.mascotImage}
            sizes="160px"
            priority
          />
        </div>

        <AnimatePresence mode="wait">
          {currentDish && hasImage && (
            <motion.div
              key={currentDish.id + "_img"}
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -50, transition: { duration: isHeadless ? 0 : 0.3 } }}
              transition={{ type: 'spring', bounce: 0.5, duration: isHeadless ? 0 : 0.6 }}
              className={styles.foodCard}
            >
              {/* 使用原生 <img> 绕过 Next.js Image 优化管线。
                  resolvedImageSrc 已经是完整下载到内存的 blob URL 或本地路径，
                  不需要任何优化处理，直接渲染最稳定。 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={resolvedImageSrc}
                alt="Current Special" 
                className={styles.foodImage}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
                onError={(e) => {
                  // 即使 blob URL 也罕见失败，最终兜底
                  console.error('[图片渲染] img 元素 onError 触发，强制使用 fallback');
                  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Area: Clear Typography Text Showcase */}
      <div className={styles.bottomArea} ref={textAreaRef}>
        <AnimatePresence mode="wait">
          {currentDish && (
            <motion.div
              key={currentDish.id + "_txt"}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50, transition: { duration: isHeadless ? 0 : 0.3 } }}
              transition={{ type: 'spring', bounce: 0.5, duration: isHeadless ? 0 : 0.6 }}
              className={styles.textAreaContainer}
            >
              <pre 
                className={styles.dishDesc}
                style={{ 
                  fontWeight: 'bold',
                  fontSize: `${descFontSize}px`,
                  fontFamily: FONT_FAMILY,
                  lineHeight: 1.8
                }}
              >
                {formattedText}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
