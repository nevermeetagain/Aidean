/**
 * GET /.well-known/openid-configuration — OIDC 发现端点（M-SSO P1.2）。
 * 精简 discovery：仅登记本平台实际提供的端点与能力，不做全量 OIDC 声明。
 */
import { NextResponse } from "next/server";

import { AUTH_ISSUER } from "../../../lib/features/auth/constants";

export const dynamic = "force-dynamic";

export function GET(): Response {
  const issuer = process.env.NEXT_PUBLIC_SITE_URL ?? AUTH_ISSUER;
  return NextResponse.json(
    {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      userinfo_endpoint: `${issuer}/oauth/userinfo`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      revocation_endpoint: `${issuer}/oauth/revoke`,
      introspection_endpoint: `${issuer}/oauth/introspect`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      scopes_supported: ["openid", "profile", "wallet:read", "billing:write"],
      token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
      claims_supported: ["sub", "email", "nickname", "tier", "role", "amr"],
    },
    { headers: { "cache-control": "public, max-age=300" } }
  );
}
