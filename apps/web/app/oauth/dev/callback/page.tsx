// OAuth dev 工具页：模拟第三方回调地址，供 SSO 三方联调使用。
// 仅展示回调 query 参数（code / state / error / 其余参数），无鉴权、无站点导航/页脚。
// UX-21 / 用户裁定 2：仅非生产环境挂载——NODE_ENV=production 时直接 notFound()（404），
// 避免生产暴露无鉴权回显授权码的联调页；非生产同时声明 noindex。
import { use } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OAuth 模拟回调（dev）",
  robots: { index: false, follow: false },
};

/** 生产构建不挂载本联调页 */
function isOAuthDevCallbackEnabled(env: string | undefined = process.env.NODE_ENV): boolean {
  return env !== "production";
}

type SearchParams = Record<string, string | string[] | undefined>;

const KNOWN_KEYS = ["code", "state", "error"];

function formatValue(value: string | string[] | undefined): string {
  if (value === undefined) return "（未提供）";
  return Array.isArray(value) ? value.join(", ") : value;
}

export default function OAuthDevCallbackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!isOAuthDevCallbackEnabled()) notFound();
  const searchParamsObj = use(searchParams);
  const keys = Object.keys(searchParamsObj);
  const otherKeys = keys.filter((key) => !KNOWN_KEYS.includes(key));
  const hasParams = keys.length > 0;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>OAuth 模拟回调</h1>
      <p style={{ fontSize: 13, margin: "0 0 24px", opacity: 0.75 }}>
        仅用于 OAuth 联调的模拟第三方回调页（dev tool）。无鉴权，请勿配置为生产回调地址。
      </p>

      {hasParams ? (
        <>
          <dl style={{ margin: 0 }}>
            {KNOWN_KEYS.map((key) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <dt style={{ fontWeight: 700, fontSize: 13 }}>{key}</dt>
                <dd
                  style={{
                    margin: "4px 0 0",
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {formatValue(searchParamsObj[key])}
                </dd>
              </div>
            ))}
          </dl>

          {otherKeys.length > 0 && (
            <section style={{ marginTop: 24 }}>
              <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 12px" }}>
                其他 query 参数
              </p>
              <dl style={{ margin: 0 }}>
                {otherKeys.map((key) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <dt style={{ fontWeight: 700, fontSize: 13 }}>{key}</dt>
                    <dd
                      style={{
                        margin: "4px 0 0",
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                      }}
                    >
                      {formatValue(searchParamsObj[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </>
      ) : (
        <p style={{ fontSize: 14, opacity: 0.75 }}>无回调参数</p>
      )}
    </main>
  );
}
