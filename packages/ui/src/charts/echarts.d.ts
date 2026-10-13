// 本地最小类型声明:echarts 是 optional peer,pnpm autoInstallPeers 不安装,
// 本包编译期不依赖其真实类型;消费方安装 echarts 后以真实类型渲染,互不冲突。
declare module "echarts" {
  export interface EChartsInitOptions {
    renderer?: "canvas" | "svg";
  }
  export interface EChartsInstance {
    setOption(option: unknown, opts?: { notMerge?: boolean }): void;
    resize(): void;
    dispose(): void;
  }
  export function init(
    el: HTMLElement,
    theme?: string | undefined,
    opts?: EChartsInitOptions,
  ): EChartsInstance;
  const echarts: { init: typeof init };
  export default echarts;
}