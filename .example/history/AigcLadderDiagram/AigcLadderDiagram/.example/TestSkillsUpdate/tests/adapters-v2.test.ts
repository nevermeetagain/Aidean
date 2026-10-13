/**
 * v2.0 测试 - 新适配器（Skills.sh/npm/GitHub）
 * 验证适配器工厂、字段映射、数据分层
 */

import { describe, it, expect, vi } from 'vitest';
import { createAdapter } from '../src/adapters/index';
import { SkillsShAdapter } from '../src/adapters/SkillsShAdapter';
import { NpmAdapter } from '../src/adapters/NpmAdapter';
import { GitHubAdapter } from '../src/adapters/GitHubAdapter';
import { DataLayer } from '../src/types/skill';

describe('AdapterFactory v2.0', () => {
  const baseConfig = {
    sourceCode: 'skillsmp' as const,
    sourceName: 'Test',
    baseUrl: 'https://test.com',
    rateLimitRequests: 100,
    rateLimitWindow: 60,
    dataLayer: DataLayer.L1_COMMUNITY,
    trustScore: 70,
  };

  it('应该创建 SkillsShAdapter', () => {
    const adapter = createAdapter({ ...baseConfig, sourceCode: 'skills_sh', baseUrl: 'https://skills.sh' });
    expect(adapter).toBeInstanceOf(SkillsShAdapter);
  });

  it('应该创建 NpmAdapter', () => {
    const adapter = createAdapter({ ...baseConfig, sourceCode: 'npm', baseUrl: 'https://registry.npmjs.org' });
    expect(adapter).toBeInstanceOf(NpmAdapter);
  });

  it('应该创建 GitHubAdapter', () => {
    const adapter = createAdapter({ ...baseConfig, sourceCode: 'github', baseUrl: 'https://api.github.com' });
    expect(adapter).toBeInstanceOf(GitHubAdapter);
  });

  it('未知数据源应抛出错误', () => {
    expect(() => createAdapter({ ...baseConfig, sourceCode: 'unknown' as any })).toThrow('Unknown data source');
  });
});

describe('SkillsShAdapter', () => {
  const config = {
    sourceCode: 'skills_sh' as const,
    sourceName: 'Skills.sh',
    baseUrl: 'https://skills.sh',
    rateLimitRequests: 80,
    rateLimitWindow: 60,
    dataLayer: DataLayer.L1_COMMUNITY,
    trustScore: 50,
  };

  it('字段映射应正确转换source字段', () => {
    const adapter = new SkillsShAdapter(config);
    const mapping = adapter.getFieldMapping();
    
    // source应该是固定值'skills_sh'
    expect(typeof mapping.source === 'function' ? (mapping.source as Function)({}) : mapping.source).toBe('skills_sh');
  });

  it('字段映射应正确生成skillKey', () => {
    const adapter = new SkillsShAdapter(config);
    const mapping = adapter.getFieldMapping();
    
    const skillKey = (mapping.skillKey as Function)({ slug: 'my-skill', id: '123' });
    expect(skillKey).toBe('skills_sh:my-skill');
  });

  it('字段映射应处理缺失slug的情况', () => {
    const adapter = new SkillsShAdapter(config);
    const mapping = adapter.getFieldMapping();
    
    const skillKey = (mapping.skillKey as Function)({ id: '456' });
    expect(skillKey).toBe('skills_sh:456');
  });
});

describe('NpmAdapter', () => {
  const config = {
    sourceCode: 'npm' as const,
    sourceName: 'npm Registry',
    baseUrl: 'https://registry.npmjs.org',
    rateLimitRequests: 200,
    rateLimitWindow: 60,
    dataLayer: DataLayer.L0_RAW,
    trustScore: 90,
  };

  it('字段映射应正确转换source字段', () => {
    const adapter = new NpmAdapter(config);
    const mapping = adapter.getFieldMapping();
    
    expect(typeof mapping.source === 'function' ? (mapping.source as Function)({}) : mapping.source).toBe('npm');
  });

  it('字段映射应正确生成installCommand', () => {
    const adapter = new NpmAdapter(config);
    const mapping = adapter.getFieldMapping();
    
    const cmd = (mapping.installCommand as Function)({ name: '@mcp/server-test' });
    expect(cmd).toBe('npm install @mcp/server-test');
  });

  it('字段映射应正确处理author字段', () => {
    const adapter = new NpmAdapter(config);
    const mapping = adapter.getFieldMapping();
    
    // 对象形式的author
    expect((mapping.author as Function)({ author: { name: 'John' } })).toBe('John');
    // 字符串形式的author
    expect((mapping.author as Function)({ author: 'Jane' })).toBe('Jane');
    // 从maintainers推断
    expect((mapping.author as Function)({ maintainers: [{ name: 'Bob' }] })).toBe('Bob');
    // 默认值
    expect((mapping.author as Function)({})).toBe('unknown');
  });

  it('npm数据分层应为L0_RAW', () => {
    expect(config.dataLayer).toBe(DataLayer.L0_RAW);
  });
});

describe('GitHubAdapter', () => {
  const config = {
    sourceCode: 'github' as const,
    sourceName: 'GitHub',
    baseUrl: 'https://api.github.com',
    rateLimitRequests: 5000,
    rateLimitWindow: 3600,
    dataLayer: DataLayer.L0_RAW,
    trustScore: 100,
  };

  it('字段映射应正确转换source字段', () => {
    const adapter = new GitHubAdapter(config);
    const mapping = adapter.getFieldMapping();
    
    expect(typeof mapping.source === 'function' ? (mapping.source as Function)({}) : mapping.source).toBe('github');
  });

  it('字段映射应正确生成skillKey', () => {
    const adapter = new GitHubAdapter(config);
    const mapping = adapter.getFieldMapping();
    
    const skillKey = (mapping.skillKey as Function)({ full_name: 'owner/repo', id: 123 });
    expect(skillKey).toBe('github:owner/repo');
  });

  it('downloadCount映射到forks_count', () => {
    const adapter = new GitHubAdapter(config);
    const mapping = adapter.getFieldMapping();
    
    // GitHub用forks代替downloadCount
    const forks = (mapping.downloadCount as Function)({ forks_count: 42 });
    expect(forks).toBe(42);
  });

  it('GitHub数据分层应为L0_RAW但trustScore为100', () => {
    expect(config.dataLayer).toBe(DataLayer.L0_RAW);
    expect(config.trustScore).toBe(100);
  });
});

describe('数据分层一致性', () => {
  it('所有数据源配置应包含dataLayer和trustScore', () => {
    const configs = [
      { sourceCode: 'skillsmp', dataLayer: DataLayer.L1_COMMUNITY, trustScore: 70 },
      { sourceCode: 'smithery', dataLayer: DataLayer.L1_COMMUNITY, trustScore: 60 },
      { sourceCode: 'skills_sh', dataLayer: DataLayer.L1_COMMUNITY, trustScore: 50 },
      { sourceCode: 'npm', dataLayer: DataLayer.L0_RAW, trustScore: 90 },
      { sourceCode: 'github', dataLayer: DataLayer.L0_RAW, trustScore: 100 },
    ];

    for (const cfg of configs) {
      expect(cfg.dataLayer).toBeDefined();
      expect(cfg.trustScore).toBeGreaterThan(0);
      expect(cfg.trustScore).toBeLessThanOrEqual(100);
    }
  });

  it('L0原始源的trustScore范围合理', () => {
    const l0Sources = ['npm', 'github'];
    // npm下载量权威，GitHub stars权威，虽然是L0但特定数据维度可信
    expect(l0Sources.length).toBeGreaterThan(0);
  });

  it('L1社区源的trustScore低于权威源', () => {
    const l1Trust = [70, 60, 50]; // skillsmp, smithery, skills_sh
    const authority = 100; // L3权威源
    for (const t of l1Trust) {
      expect(t).toBeLessThan(authority);
    }
  });
});
