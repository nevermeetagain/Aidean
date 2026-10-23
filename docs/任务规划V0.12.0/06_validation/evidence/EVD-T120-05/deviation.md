T120-05 偏离说明（7 条）

1. 差集口径按 apps/web 收敛，与卡面「来源方案」的 /workspace 全仓数字不同：基线写「引用 34 / 示例 41 / 缺 20 / 冗余 27」，
   本机实测 apps/web tracked 源码读取点 = 24（23 个大写键 + 小写 http_proxy/https_proxy，去重后含框架注入的 NODE_ENV/NEXT_PHASE），
   packages/** 读取点 = 0，全仓 = 43。Step 1 的「全集」按本卡允许的 apps/web 口径达成；未扩扫 packages/**（非允许路径且无命中）。

2. 「冗余 27 项保留并标注」只落在允许路径内标注：三份 example 并集 53 键，反向差集 29 项中 7 项被 docker-compose 引用（已在
   apps/web/.env.example 的「Docker 编排键」区块标注），另 22 项位于 docker/.env.example（34 键）与 .env.smtp.example（5 键）——
   两者不在本卡「允许修改」，故只由守卫 env-diff.mjs 以 WARN 输出清单，未在源文件内加字样。

3. `??` 型读取点在模板中必须保持注释态，否则空串会越过回落：SMTP_FROM（auth/mailer.ts）、JWT_PRIVATE_KEY（auth/keys.ts:75）、
   BILLING_NOTIFY_SECRET（billing/service.ts:183）、WECHAT_SECRET 等写成 `# KEY=` 而非 `KEY=`。守卫 parseExample 把注释态键计为已登记，
   故验收①仍为 ∅；这与「补齐缺失项」的字面写法不同，属刻意为之。

4. 必需分级以卡面「以代码读取为准」为准，与「输入」列举不完全一致：硬必需 = DATABASE_URL、JWT_SECRET；
   JWT_PRIVATE_KEY 有 Redis 密钥环降级分支、BILLING_NOTIFY_SECRET 有 dev 默认值 → 归入「生产强建议」（缺失仅 WARN）。
   若按列举把二者设为硬失败，会在 dev/compose 链路启动即崩，且违反验收③「不改既有默认值语义」。

5. blocked（唯一红项，本卡因此未推送）：新增 apps/web/lib/config/__tests__/env.spec.ts 使 spec 文件数 213→214，
   `node scripts/check-docs-facts.mjs` 的 spec-count 断言 EXIT=1（其余 15 条断言全 ✓）。pin 在 scripts/check-docs-facts.mjs:138，
   同文件 :135 的 desc 需按 R10-01 约定追加「前次 T120-05 …」注记——该文件不在本卡「允许修改」→ 依任务书 §三.7 停笔并报 Hark。
   修正量 = 1 行数字 + desc 一句；由 Hark 在 main 提出，或用户授权本卡改后本卡即可推送。

6. 守卫尚未接入总门禁：scripts/guard/run-all.mjs 的 GUARDS 现含 6 项、不含 env-diff.mjs，该文件不在本卡允许路径故未加。
   建议 Hark 增补一行，使「referenced − example = ∅」成为常态门禁而非仅本卡验证命令。

7. 铁律 6（文档即结构）的同步缺口全部在本卡允许路径外，故未落笔：docs/governance/目录结构文档.md 需登记新增的
   apps/web/lib/config/（env.ts + __tests__/env.spec.ts）与根 apps/web/instrumentation.ts，并核对其中 env 文件清单与
   「.env.example 变量名 + 注释模板」两行；docs/engineering/开发环境搭建.md、docs/engineering/部署运维文档.md 的环境变量
   章节也应改指向 .env.example 为唯一真源并说明启动期校验。抄送 Hark，建议并入 T120-08 / T120-36。
