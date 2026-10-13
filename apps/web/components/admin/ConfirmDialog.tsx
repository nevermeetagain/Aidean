"use client";

/**
 * ConfirmDialog — 封装 @aidean/ui Dialog 的确认弹窗，替代原生 confirm()。
 * 调用方维护 open 状态，onConfirm/onCancel 分别处理确认/取消。
 *
 * 用法：
 *   const [pending, setPending] = useState(false);
 *   <ConfirmDialog open={pending}
 *     title="确认删除" message="确认批量删除 3 项？"
 *     onConfirm={() => { doDelete(); setPending(false); }}
 *     onCancel={() => setPending(false)} />
 */
import { Button, Dialog } from "@aidean/ui";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = "确认操作",
  message,
  confirmLabel = "确认",
  cancelLabel = "取消",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={variant} size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
