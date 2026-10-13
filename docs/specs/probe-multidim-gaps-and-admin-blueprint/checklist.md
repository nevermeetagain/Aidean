# Checklist

- [x] 五问每问有代码级证据支撑（文件路径/行号/rg 输出/测试文件名），无凭记忆断言（审计 §8.1-8.5：qrcode route.ts L3-11、gateway-orchestrator.spec L94-96/132-139/173-175、page.tsx 1290B、组件消费方清单等）
- [x] UI 维度：页面树清单完整（(web) 12 页 + oauth 8 目录 + api 全路由），/user/balance 与 /user/console 功能核验完成（真实接线：walletService/billingService/userService）
- [x] 联动维度：内部闭环矩阵每条标注证据；外部等待清单完整（子平台/支付/微信）；空转联动盘点含 13 个 seed 配置（零消费）+ wechat/qrcode（注释桩）+ user/* 端点消费核验（GeneralForm/ProPrioritiesList/AuthForm）
- [x] 数据维度：system_configs 14 项逐项给出判定与读侧证据（§8.4 判定表）；seed 量级画像（9 Data 数组/模型 20+）与千级目标差距量化（1-2 量级）
- [x] admin 维度：缺失功能矩阵覆盖 API 文档 §5.8 全部规划域（仅榜单配置域部分覆盖，其余全域缺失）
- [x] 审计 v1.2 版本标记合规（铁律 3），五维问答章节含证据链接
- [x] admin 蓝图含布局方案（A 侧栏/B Tabs）、P0/P1/P2 矩阵、API 增量清单，且登记为后续 spec 候选（本 spec 零业务代码变更）
- [x] 行动序更新且 e2e 回归仍居发布前首位（行动 1）
- [x] spec 三件套归档 + 项目记忆更新完成（含 IDE 缓冲区覆盖编辑的新教训）
