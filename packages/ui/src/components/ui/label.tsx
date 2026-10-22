// 占位简化版:原生 <label> 透传;不引 cva/radix,零业务逻辑,MVP 可用性优先
// B11-04a:为 admin 表单原生 <label> 189 处迁移提供规范件（消解 DEF-011-07）
import { forwardRef } from "react";
import type { LabelHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  // required=true 时在文字尾部渲染一个 aria-hidden 的红色星号——视觉提示,
  // 不改变 label 的语义（真正的必填校验交给被关联控件的 required 属性）。
  required?: boolean;
}

// 基线契约（对齐 shadcn/ui Label 的常用样式但保持零依赖）：
// - block + text-sm font-medium:表单字段主标签的通用尺度
// - peer-disabled:兄弟输入禁用时自动降透明度——无需业务代码联动 class
// - htmlFor 走 LabelHTMLAttributes 透传（rest 里带出）
export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required = false, children, ...rest }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-sm font-medium leading-none text-[var(--foreground)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...rest}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-[var(--danger)]">
          *
        </span>
      ) : null}
    </label>
  ),
);
Label.displayName = "Label";
