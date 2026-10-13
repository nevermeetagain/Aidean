/**
 * Skill 同步脚本 - 适配器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SkillsMPAdapter } from '../src/adapters/SkillsMPAdapter';
import { SmitheryAdapter } from '../src/adapters/SmitheryAdapter';
import { DataSourceConfig, RawSkillRecord } from '../src/types/skill';

// Mock 数据源配置
const mockSkillsMPConfig: DataSourceConfig = {
  sourceCode: 'skillsmp',
  sourceName: 'SkillsMP',
  baseUrl: 'https://api.skillsmp.com',
  rateLimitRequests: 100,
  rateLimitWindow: 60,
};

const mockSmitheryConfig: DataSourceConfig = {
  sourceCode: 'smithery',
  sourceName: 'Smithery',
  baseUrl: 'https://api.smithery.ai',
  rateLimitRequests: 60,
  rateLimitWindow: 60,
};

describe('SkillsMPAdapter', () => {
  let adapter: SkillsMPAdapter;

  beforeEach(() => {
    adapter = new SkillsMPAdapter(mockSkillsMPConfig);
  });

  describe('getFieldMapping', () => {
    it('应该返回正确的字段映射', () => {
      const mapping = adapter.getFieldMapping();
      
      expect(mapping).toHaveProperty('skillKey');
      expect(mapping).toHaveProperty('name');
      expect(mapping).toHaveProperty('description');
      expect(mapping).toHaveProperty('author');
      expect(mapping).toHaveProperty('stars');
    });
  });

  describe('normalize', () => {
    it('应该正确标准化原始数据', () => {
      const rawData: RawSkillRecord = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        author: 'test-author',
        repo: 'owner/repo',
        url: 'https://example.com',
        stars: 100,
        installs: 50,
        category: 'test',
        tags: ['tag1', 'tag2'],
        version: '1.0.0',
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      const normalized = adapter.normalize(rawData);

      expect(normalized.skillKey).toBe('skillsmp:owner/repo');
      expect(normalized.name).toBe('Test Skill');
      expect(normalized.description).toBe('A test skill');
      expect(normalized.author).toBe('test-author');
      expect(normalized.source).toBe('skillsmp');
      expect(normalized.sourceId).toBe('owner/repo');
      expect(normalized.stars).toBe(100);
      expect(normalized.downloadCount).toBe(50);
      expect(normalized.category).toBe('test');
      expect(normalized.tags).toEqual(['tag1', 'tag2']);
      expect(normalized.version).toBe('1.0.0');
      expect(normalized.rawHash).toBeDefined();
    });

    it('应该处理缺失字段', () => {
      const rawData: RawSkillRecord = {
        id: 'minimal-skill',
        name: 'Minimal Skill',
      };

      const normalized = adapter.normalize(rawData);

      expect(normalized.skillKey).toBe('skillsmp:minimal-skill');
      expect(normalized.name).toBe('Minimal Skill');
      expect(normalized.stars).toBe(0);
      expect(normalized.downloadCount).toBe(0);
      expect(normalized.tags).toEqual([]);
    });
  });
});

describe('SmitheryAdapter', () => {
  let adapter: SmitheryAdapter;

  beforeEach(() => {
    adapter = new SmitheryAdapter(mockSmitheryConfig);
  });

  describe('getFieldMapping', () => {
    it('应该返回正确的字段映射', () => {
      const mapping = adapter.getFieldMapping();
      
      expect(mapping).toHaveProperty('skillKey');
      expect(mapping).toHaveProperty('name');
      expect(mapping).toHaveProperty('description');
      expect(mapping).toHaveProperty('author');
      expect(mapping).toHaveProperty('stars');
    });
  });

  describe('normalize', () => {
    it('应该正确标准化原始数据', () => {
      const rawData: RawSkillRecord = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        owner: { login: 'test-author' },
        full_name: 'owner/repo',
        html_url: 'https://github.com/owner/repo',
        stargazers_count: 200,
        install_count: 100,
        topics: ['topic1', 'topic2'],
        updated_at: '2024-01-01T00:00:00Z',
      };

      const normalized = adapter.normalize(rawData);

      expect(normalized.skillKey).toBe('smithery:owner/repo');
      expect(normalized.name).toBe('Test Skill');
      expect(normalized.author).toBe('test-author');
      expect(normalized.source).toBe('smithery');
      expect(normalized.sourceId).toBe('owner/repo');
      expect(normalized.stars).toBe(200);
      expect(normalized.downloadCount).toBe(100);
      expect(normalized.tags).toEqual(['topic1', 'topic2']);
      expect(normalized.rawHash).toBeDefined();
    });

    it('应该正确处理 owner 字符串格式', () => {
      const rawData: RawSkillRecord = {
        id: 'test-skill',
        name: 'Test Skill',
        author: 'string-author',
        repo: 'owner/repo',
      };

      const normalized = adapter.normalize(rawData);

      expect(normalized.author).toBe('string-author');
    });
  });
});
