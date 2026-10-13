/**
 * oauth 域 clients：接入方（Relying Party）注册数据访问与校验（M-SSO P1.1）。
 *
 * 安全部约：
 * - redirect_uri **精确匹配**（RFC 6749 §10.6：不做前缀/通配，杜绝开放重定向）；
 * - secret 以 bcrypt 哈希存储（与主站用户密码同强度口径）；
 * - isActive=false 的 client 一律拒绝（下线开关）。
 */
import { hashPasswordSync, verifyPasswordSync, SALT_ROUNDS } from "../auth/password";

import { prisma } from "../../db/prisma";

export interface OidcClientRow {
  id: string;
  clientId: string;
  name: string;
  clientSecretHash: string;
  redirectUris: string[];
  logoutUri: string | null;
  scopes: string[];
  pkceRequired: boolean;
  firstParty: boolean;
  isActive: boolean;
}

export const oidcClientRepository = {
  async findByClientId(clientId: string): Promise<OidcClientRow | null> {
    return prisma.oidcClient.findUnique({
      where: { clientId },
      select: {
        id: true,
        clientId: true,
        name: true,
        clientSecretHash: true,
        redirectUris: true,
        logoutUri: true,
        scopes: true,
        pkceRequired: true,
        firstParty: true,
        isActive: true,
      },
    });
  },
};

export const oidcClientService = {
  /** 取活跃 client；不存在/停用统一 null（不泄露存在性差异） */
  async getActiveClient(clientId: string): Promise<OidcClientRow | null> {
    if (!clientId) return null;
    const row = await oidcClientRepository.findByClientId(clientId);
    if (!row || !row.isActive) return null;
    return row;
  },

  /** redirect_uri 精确匹配白名单 */
  isRedirectUriAllowed(client: OidcClientRow, redirectUri: string): boolean {
    return client.redirectUris.includes(redirectUri);
  },

  /** client secret 时序安全比对（bcrypt compareSync 内部恒时） */
  verifyClientSecret(client: OidcClientRow, secret: string): boolean {
    return verifyPasswordSync(secret, client.clientSecretHash);
  },

  /** scope 子集校验：请求 scope 必须是 client 注册 scopes 的子集（缺省取注册值） */
  resolveScopes(client: OidcClientRow, requested: string | null): string[] | null {
    if (!requested) return client.scopes;
    const asked = requested.split(" ").filter(Boolean);
    const allowed = client.scopes;
    for (const s of asked) {
      if (!allowed.includes(s)) return null;
    }
    return asked;
  },

  /** 注册/更换 client secret（管理面用；本文件仅提供哈希工具保持哈希策略单点） */
  hashClientSecret(secret: string): string {
    return hashPasswordSync(secret, SALT_ROUNDS);
  },

  /**
   * 服务端点统一 client 认证（token/revoke/introspect/internal 共用）：
   * HTTP Basic 优先，回退 form 字段；secret bcrypt 恒时比对 + 活跃性校验。
   * 失败返回 null（调用方映射 401 invalid_client）。
   */
  async authenticateClient(
    req: Request,
    form: URLSearchParams
  ): Promise<OidcClientRow | null> {
    let clientId: string | null = null;
    let secret: string | null = null;
    const basic = req.headers.get("authorization");
    if (basic?.startsWith("Basic ")) {
      try {
        const decoded = atob(basic.slice(6));
        const idx = decoded.indexOf(":");
        if (idx > 0) {
          clientId = decoded.slice(0, idx);
          secret = decoded.slice(idx + 1);
        }
      } catch {
        return null;
      }
    } else {
      clientId = form.get("client_id");
      secret = form.get("client_secret");
    }
    if (!clientId || !secret) return null;
    const client = await oidcClientService.getActiveClient(clientId);
    if (!client || !oidcClientService.verifyClientSecret(client, secret)) return null;
    return client;
  },

  /** scope 校验：client 注册面必须覆盖所需 scope */
  hasScope(client: OidcClientRow, required: string): boolean {
    return client.scopes.includes(required);
  },
};
