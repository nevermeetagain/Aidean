/**
 * 错误码和错误消息常量
 */

// HTTP错误码对应消息
export const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: "请求参数错误",
  401: "未授权，请重新登录",
  403: "无权访问此资源",
  404: "请求的资源不存在",
  405: "请求方法不允许",
  409: "资源冲突，请稍后重试",
  422: "请求数据验证失败",
  429: "请求过于频繁，请稍后重试",
  500: "服务器内部错误",
  502: "网关错误",
  503: "服务暂时不可用",
  504: "网关超时",
};

// 业务错误消息
export const BUSINESS_ERROR_MESSAGES: Record<string, string> = {
  // 认证
  AUTH001: "无效的认证令牌",
  AUTH002: "认证令牌已过期，请重新登录",
  AUTH003: "权限不足",

  // 用户
  USER001: "用户不存在",
  USER002: "用户已存在",
  USER003: "密码错误",
  USER004: "账号已被禁用",
  USER005: "邮箱未验证",

  // 模型
  MODEL001: "模型不存在",
  MODEL002: "模型已存在",
  MODEL003: "模型评分计算失败",

  // 资源
  RESOURCE001: "资源不存在",
  RESOURCE002: "资源已被收藏",
  RESOURCE003: "资源收藏失败",

  // 测评
  EVAL001: "测评任务创建失败",
  EVAL002: "测评任务执行超时",
  EVAL003: "余额不足，请充值",

  // 通用
  COMMON001: "请求数据验证失败",
  COMMON002: "请求的资源不存在",
  COMMON003: "操作失败，请稍后重试",
  COMMON004: "请求过于频繁",
  COMMON005: "网络连接失败",
  COMMON006: "服务器繁忙，请稍后重试",
};

// 表单验证错误消息
export const VALIDATION_MESSAGES = {
  required: "此项为必填项",
  email: "请输入有效的邮箱地址",
  phone: "请输入有效的手机号码",
  url: "请输入有效的URL地址",
  minLength: (min: number) => `至少需要 ${min} 个字符`,
  maxLength: (max: number) => `最多允许 ${max} 个字符`,
  minValue: (min: number) => `最小值为 ${min}`,
  maxValue: (max: number) => `最大值为 ${max}`,
  pattern: "格式不正确",
  match: "两次输入不一致",
} as const;
