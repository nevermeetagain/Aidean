// class 合并工具（AT-18.2.1 / WF-18）：clsx 组装 + tailwind-merge 冲突消解。
// 背景（P3 根因链）：旧实现为手写拼接，ghost 变体的 bg-transparent 与业务方 bg-primary
// 双类并存于 class 属性，胜负由样式表声明顺序决定（随构建器漂移），曾致登录按钮
// 白字白底不可见。改经 twMerge 后同组冲突由后写入者胜出，与书写意图一致。
// 签名兼容：保留 ClassValue 导出与 cn(...inputs) 形参形状，既有调用点零改动。
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
