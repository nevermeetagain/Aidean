// OIDC 客户端取证：clientId / redirectUris（含 3333 固化校验）/ 幂等后数量
// 用途：DB 窗口与 seed 幂等后确认 first-party 客户端未被重复创建、redirectUris 不回退
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const rows = await p.oidcClient.findMany({
    select: { clientId: true, redirectUris: true },
    orderBy: { clientId: "asc" },
  });
  console.log("oidc_clients rows:", rows.length);
  for (const r of rows) {
    const uris = Array.isArray(r.redirectUris) ? r.redirectUris : [];
    console.log(
      `  - ${r.clientId}: uris=${uris.length}`,
      "| has3333:",
      uris.some((u) => String(u).includes("3333")),
      "|",
      uris.join(",")
    );
  }
}

main()
  .then(() => p.$disconnect())
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  });
