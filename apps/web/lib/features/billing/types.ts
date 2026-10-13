/**
 * billing 计费域 types（B.2.2）：域内公共类型薄层。
 *
 * 对外契约（Zod schema 与视图类型）以 @aidean/shared 为单一来源
 * （见 packages/shared/src/schemas/billing.schema.ts）；本文件仅收敛服务层内部公共类型。
 */
export type { PayChannel, WalletSnapshot } from "./service";
