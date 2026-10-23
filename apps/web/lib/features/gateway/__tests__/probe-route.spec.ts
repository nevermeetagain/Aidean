/**
 * T120-23 · POST /api/v1/user/custom-channels/{id}/probe 契约测：
 * 200 + ChannelProbeResponse 形状 / 写回 lastTest* / 30005(400) / 10006(429) / 他人渠道 40000 / 非 uuid 40000 / 未登录 10004。
 */
import { ChannelProbeResponse, ERROR_CODES } from '@aidean/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  requireUserApi: vi.fn(),
  findCustomChannel: vi.fn(),
  updateMany: vi.fn(async (_args: unknown) => ({ count: 1 })),
  checkFixedWindow: vi.fn(async () => ({ allowed: true, count: 1 })),
  probeChannel: vi.fn(),
}));

vi.mock('../../auth/session', () => ({ requireUserApi: h.requireUserApi }));
vi.mock('../repository', () => ({ gatewayRepository: { findCustomChannel: h.findCustomChannel } }));
vi.mock('../../../db/prisma', () => ({ prisma: { customChannel: { updateMany: h.updateMany } } }));
vi.mock('../../../rate-limit', () => ({ checkFixedWindow: h.checkFixedWindow }));
vi.mock('../../apikey/crypto', () => ({ decryptSecret: vi.fn(() => 'sk-plain') }));
vi.mock('../probe', async (orig) => {
  const real = await orig<typeof import('../probe')>();
  return { ...real, probeChannel: h.probeChannel };
});

import { ProbeTargetForbiddenError } from '../probe';
import { POST } from '../../../../app/api/v1/user/custom-channels/[id]/probe/route';
import { ApiError } from '../../../../app/api/v1/_lib/errors';

const ID = '0192f000-0000-7000-8000-0000000000d1';
const call = (id = ID) =>
  POST(new Request(`http://localhost/api/v1/user/custom-channels/${id}/probe`, { method: 'POST' }), {
    params: Promise.resolve({ id }),
  });
const body = async (res: Response) => (await res.json()) as { code: number; data: unknown };

beforeEach(() => {
  vi.clearAllMocks();
  h.requireUserApi.mockResolvedValue({ userId: 'u1' });
  h.findCustomChannel.mockResolvedValue({ id: ID, baseUrl: 'https://api.x.com/v1', keyCipher: 'c', format: 'OPENAI' });
  h.checkFixedWindow.mockResolvedValue({ allowed: true, count: 1 });
});

describe('POST custom-channels/{id}/probe', () => {
  it('reachable → 200，响应符合 ChannelProbeResponse，lastTestOk=true', async () => {
    h.probeChannel.mockResolvedValue({
      outcome: 'reachable', httpStatus: 200, latencyMs: 42, modelCount: 3, probedAt: new Date().toISOString(),
    });
    const res = await call();
    expect(res.status).toBe(200);
    const b = await body(res);
    expect(b.code).toBe(0);
    expect(ChannelProbeResponse.safeParse(b.data).success).toBe(true);
    expect(h.probeChannel).toHaveBeenCalledWith({ baseUrl: 'https://api.x.com/v1', apiKey: 'sk-plain', format: 'OPENAI' });
    expect(h.updateMany).toHaveBeenCalledWith({
      where: { id: ID, userId: 'u1' },
      data: { lastTestAt: expect.any(Date), lastTestOk: true },
    });
  });

  it.each(['auth_failed', 'timeout', 'bad_response'] as const)('%s → 200 且 lastTestOk=false', async (outcome) => {
    h.probeChannel.mockResolvedValue({ outcome, httpStatus: null, latencyMs: null, modelCount: null, probedAt: new Date().toISOString() });
    const res = await call();
    expect(res.status).toBe(200);
    expect(((await body(res)).data as { outcome: string }).outcome).toBe(outcome);
    expect(h.updateMany.mock.calls[0][0]).toMatchObject({ data: { lastTestOk: false } });
  });

  it('目标被拒 → 30005 / HTTP 400，lastTestOk=false', async () => {
    h.probeChannel.mockRejectedValue(new ProbeTargetForbiddenError('仅允许 https'));
    const res = await call();
    expect(res.status).toBe(400);
    expect((await body(res)).code).toBe(ERROR_CODES.CHANNEL_PROBE_TARGET_FORBIDDEN);
    expect(h.updateMany.mock.calls[0][0]).toMatchObject({ data: { lastTestOk: false } });
  });

  it('限流 → 10006 / 429，键为每用户 10/60s，不查渠道', async () => {
    h.checkFixedWindow.mockResolvedValue({ allowed: false, count: 11 });
    const res = await call();
    expect(res.status).toBe(429);
    expect((await body(res)).code).toBe(ERROR_CODES.TOO_MANY_REQUESTS);
    expect(h.checkFixedWindow).toHaveBeenCalledWith('rl:probe:user:u1', 10, 60);
    expect(h.findCustomChannel).not.toHaveBeenCalled();
  });

  it('他人/不存在渠道 → 40000，不探测', async () => {
    h.findCustomChannel.mockResolvedValue(null);
    const res = await call();
    expect((await body(res)).code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(h.probeChannel).not.toHaveBeenCalled();
  });

  it('非 uuid → 40000', async () => {
    const res = await call('1');
    expect((await body(res)).code).toBe(ERROR_CODES.BAD_REQUEST);
  });

  it('未登录 → 10004', async () => {
    h.requireUserApi.mockRejectedValue(new ApiError(ERROR_CODES.UNAUTHENTICATED, '未登录'));
    const res = await call();
    expect(res.status).toBe(401);
    expect((await body(res)).code).toBe(ERROR_CODES.UNAUTHENTICATED);
  });
});
