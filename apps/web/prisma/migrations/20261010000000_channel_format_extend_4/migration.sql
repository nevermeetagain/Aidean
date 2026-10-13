-- M3 上游协议扩展：ChannelFormat 枚举新增 openai-responses('3') / gemini('4')
-- 上游协议单一真源由 {openai, anthropic} 扩为四值。PG16 支持在事务内 ADD VALUE（新值不在本事务内使用）。
ALTER TYPE "ChannelFormat" ADD VALUE IF NOT EXISTS '3';
ALTER TYPE "ChannelFormat" ADD VALUE IF NOT EXISTS '4';
