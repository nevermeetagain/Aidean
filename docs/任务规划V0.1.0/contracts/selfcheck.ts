// > 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档——契约自检脚本（唯一源一致性：冻结稿 vs 现行运行时码表）
// 运行：cd "docs/任务规划V0.1.0/contracts" && ../../../node_modules/.bin/tsc -p tsconfig.json && ../../../apps/web/node_modules/.bin/tsx --tsconfig tsconfig.json selfcheck.ts
import { ERROR_CODES as C, DEFAULT_STATUS_BY_CODE as S, ErrorBodySchema, FAILURE_PATHS, ERROR_PRESENTATION } from "./02-errors.contract";
import { ERROR_CODES as W, DEFAULT_STATUS_BY_CODE as WS } from "../../../apps/web/app/api/v1/_lib/errors";
const vals = Object.values(C); const dup = vals.filter((v,i)=>vals.indexOf(v)!==i);
let mism = 0; for (const [k,v] of Object.entries(W)) { if ((C as any)[k] !== v) { mism++; console.log("MISMATCH", k, v, (C as any)[k]); } }
for (const [k,v] of Object.entries(WS)) { if ((S as any)[k] !== v) { mism++; console.log("STATUS MISMATCH", k); } }
const missingPres = Object.keys(C).filter(k=>!(k in ERROR_PRESENTATION));
console.log(JSON.stringify({total: vals.length, web: Object.keys(W).length, dup, mism, missingPres, failurePaths: FAILURE_PATHS.length,
  sample: ErrorBodySchema.safeParse({code:50011,message:"x",data:null,requestId:"r"}).success,
  bad: ErrorBodySchema.safeParse({code:50003,message:"x",data:null,requestId:"r"}).success}));
