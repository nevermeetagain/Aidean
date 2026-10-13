const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function f() {
  const v = await p.vendor.count();
  const m = await p.aiModel.count();
  const s = await p.skill.count();
  const mc = await p.mCPServer.count();
  const a = await p.agent.count();
  const api = await p.aPIStation.count();
  const lc = await p.ladderChart.count();
  const sc = await p.systemConfig.count();
  const lr = await p.ladderRanking.count();
  const mp = await p.modelPrice.count();
  const ms = await p.modelScore.count();
  const bm = await p.benchmark.count();
  const ff = await p.featureFlag.count();
  const nm = await p.navigationMenu.count();
  console.log(JSON.stringify({vendor:v, model:m, skill:s, mcp:mc, agent:a, apiStation:api, ladderChart:lc, ladderRanking:lr, systemConfig:sc, modelPrice:mp, modelScore:ms, benchmark:bm, featureFlag:ff, navMenu:nm}));
  await p.$disconnect();
}
f().catch(e => { console.error(e); process.exit(1); });
