/**
 * 正则表达式常量
 */

// 邮箱验证
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 手机号验证（中国大陆）
export const PHONE_REGEX = /^1[3-9]\d{9}$/;

// 密码强度：至少8位，包含字母和数字
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

// URL验证
export const URL_REGEX = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

// IPv4地址
export const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// 颜色值（十六进制）
export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// 中文字符
export const CHINESE_REGEX = /[\u4e00-\u9fa5]/;

// 身份证（中国大陆）
export const ID_CARD_REGEX = /^[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;

// 版本号（semver简化版）
export const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

// 用户名：字母开头，允许字母数字下划线，3-20位
export const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;

// UUID
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// 日期格式：YYYY-MM-DD
export const DATE_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

// 时间格式：HH:MM:SS
export const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
