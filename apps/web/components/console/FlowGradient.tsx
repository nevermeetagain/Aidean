"use client";

// 流动模糊渐变特效层：AE「多椭圆模糊旋转 / 湍流置换 / 截半错落 / 透明度循环」的 Web 转译。
// 纯装饰层（aria-hidden，pointer-events-none），文件内不含任何业务 import。
// 动画机制：flow-spin / flow-drift / flow-opacity 三个关键帧分别驱动独立的
// rotate、translate、opacity 三条可合成属性，同一元素可并存且互不覆盖（GPU 安全）。
// 漂移方向与幅度由内联自定义属性 --flow-dx / --flow-dy 下发；
// 模糊统一走 filter: blur(...) 形式分层递减（底层 80px → 顶层 40px），
// 最底层额外叠加 SVG feTurbulence + feDisplacementMap 有机形变。
import { useId, useMemo } from "react";
import type { CSSProperties } from "react";

type Tone = "primary" | "accent";

interface FlowGradientProps {
  /** 色调家族：主品牌色或强调色（对应主题变量 --primary / --accent） */
  tone?: Tone;
  /** 伪随机种子：同 tone 不同 seed 得到不同椭圆布局，SSR/CSR 结果一致 */
  seed?: number;
  className?: string;
}

const LAYER_COUNT = 5;

// 确定性伪随机（Lehmer LCG）：不依赖 Math.random，规避水合不一致
function createSeededRandom(seed: number) {
  let state = seed > 0 ? seed % 2147483647 : 1;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

export function FlowGradient({ tone = "primary", seed = 7, className }: FlowGradientProps) {
  // SVG filter id 唯一化（useId 含冒号，过滤后保证 url(#id) 引用安全）
  const filterId = `flow-turbulence-${useId().replace(/:/g, "")}`;

  const layers = useMemo(() => {
    const rand = createSeededRandom(seed * 977 + LAYER_COUNT);
    // 主题令牌存的是完整色值（非 HSL 通道三元组），透明度用 color-mix 表达
    const colorToken = tone === "accent" ? "var(--accent)" : "var(--primary)";

    return Array.from({ length: LAYER_COUNT }, (_, i) => {
      const width = 45 + rand() * 35; // 45%~80%
      const height = 40 + rand() * 30; // 40%~70%
      const left = -10 + rand() * 55; // 允许少量溢出边缘，父容器裁剪
      const top = -10 + rand() * 50;
      const blur = 80 - i * 10; // 分层递减：80 → 40px
      const spinDuration = 18 + i * 3; // 18s~30s 错速旋转
      const driftDuration = 11 + rand() * 7;
      const opacityDuration = 6 + rand() * 4;
      const sign = i % 2 === 0 ? 1 : -1; // 相邻层错向漂移
      const dx = sign * (8 + rand() * 8);
      const dy = -sign * (6 + rand() * 6);
      const spinDelay = -(rand() * spinDuration).toFixed(1);
      const driftDelay = -(rand() * driftDuration).toFixed(1);
      const opacityDelay = -(rand() * opacityDuration).toFixed(1);

      return {
        key: i,
        style: {
          left: `${left.toFixed(2)}%`,
          top: `${top.toFixed(2)}%`,
          width: `${width.toFixed(2)}%`,
          height: `${height.toFixed(2)}%`,
          borderRadius: "50%",
          background: `color-mix(in srgb, ${colorToken} ${15 + i * 4}%, transparent)`,
          filter:
            i === 0 ? `url(#${filterId}) blur(${blur}px)` : `blur(${blur}px)`,
          "--flow-dx": `${dx.toFixed(1)}%`,
          "--flow-dy": `${dy.toFixed(1)}%`,
          animation: [
            `flow-spin ${spinDuration}s linear ${spinDelay}s infinite`,
            `flow-drift ${driftDuration}s ease-in-out ${driftDelay}s infinite`,
            `flow-opacity ${opacityDuration}s ease-in-out ${opacityDelay}s infinite`,
          ].join(", "),
          willChange: "transform, opacity",
        } as CSSProperties,
      };
    });
  }, [tone, seed, filterId]);

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none${
        className ? ` ${className}` : ""
      }`}
    >
      {/* 最底层椭圆的有机形变滤镜（湍流置换），随首层引用 */}
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" />
          <feDisplacementMap in="SourceGraphic" scale="60" />
        </filter>
      </svg>

      {layers.map(({ key, style }) => (
        <div
          key={key}
          className={`flow-layer flow-layer--${key + 1}`}
          style={style}
        />
      ))}
    </div>
  );
}
