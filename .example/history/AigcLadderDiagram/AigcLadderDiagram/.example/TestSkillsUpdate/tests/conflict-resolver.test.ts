/**
 * Skill 同步脚本 - 冲突解决器测试 v2.0
 * 覆盖场景：M3（多源冲突）、U7（评分可信度）
 */

import { describe, it, expect } from 'vitest';
import { SkillConflictResolver, defaultMergeRules } from '../src/engine/ConflictResolver';
import { Skill, SkillSyncRecord, FieldChangeLevel } from '../src/types/skill';

describe('SkillConflictResolver v2.0', () => {
  const resolver = new SkillConflictResolver(defaultMergeRules);

  const createExistingSkill = (overrides: Partial<Skill> = {}): Skill => ({
    id: 1,
    skillKey: 'skillsmp:owner/repo',
    name: 'Existing Skill',
    displayName: 'Existing Display Name',
    description: 'Existing description',
    author: 'original-author',
    source: 'skillsmp',
    sourceId: 'owner/repo',
    sourceUrl: 'https://example.com/existing',
    stars: 100,
    downloadCount: 50,
    category: 'development',
    tags: JSON.stringify(['tag1', 'tag2']),
    version: '1.0.0',
    lastUpdated: new Date('2024-01-01'),
    rawHash: 'existing-hash',
    qualityScore: 75,
    dataLayer: 1,
    multiSourceCount: 1,
    lastFieldChangeLevel: 'CONTENT',
    fieldHashes: '{}',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  const createIncomingSkill = (overrides: Partial<SkillSyncRecord> = {}): SkillSyncRecord => ({
    skillKey: 'skillsmp:owner/repo',
    name: 'Incoming Skill',
    displayName: 'Incoming Display Name',
    description: 'Incoming description',
    author: 'new-author',
    source: 'smithery',
    sourceId: 'owner/repo',
    sourceUrl: 'https://example.com/incoming',
    stars: 200,
    downloadCount: 100,
    category: 'tools',
    tags: ['tag2', 'tag3'],
    version: '2.0.0',
    lastUpdated: new Date('2024-06-01'),
    rawHash: 'incoming-hash',
    fieldHashes: {},
    qualityScore: 80,
    dataLayer: 1,
    ...overrides,
  });

  describe('场景M3: 多源数据冲突解决', () => {
    it('应该优先使用高优先级数据源的数据（priority_wins）', async () => {
      const existing = createExistingSkill({ source: 'smithery' }); // P2
      const incoming = createIncomingSkill({ source: 'skillsmp' }); // P1

      const result = await resolver.resolve(existing, incoming);

      // v2.0: 因为author/name是IDENTITY级别且值不同，会触发review
      // 但非IDENTITY字段仍按优先级解决
      expect(['merge', 'review']).toContain(result.action);
      // skillsmp (P1) 优先级高于 smithery (P2)，name应使用incoming
      expect(result.mergedData?.name).toBe('Incoming Skill');
    });

    it('应该保留低优先级数据源的数据（priority_wins）', async () => {
      const existing = createExistingSkill({ source: 'skillsmp' }); // P1
      const incoming = createIncomingSkill({ source: 'smithery' }); // P2

      const result = await resolver.resolve(existing, incoming);

      // smithery (P2) 优先级低于 skillsmp (P1)，保留 existing
      expect(result.mergedData?.name).toBe('Existing Skill');
    });

    it('v2.0: stars应该取最大值（max_wins策略）', async () => {
      const existing = createExistingSkill({ stars: 100 });
      const incoming = createIncomingSkill({ stars: 200 });

      const result = await resolver.resolve(existing, incoming);

      expect(result.mergedData?.stars).toBe(200);
    });

    it('v2.0: downloadCount应该取最大值（max_wins策略）', async () => {
      const existing = createExistingSkill({ downloadCount: 300, source: 'smithery' });
      const incoming = createIncomingSkill({ downloadCount: 100, source: 'skillsmp' });

      const result = await resolver.resolve(existing, incoming);

      // 即使skillsmp优先级更高，downloadCount仍然取最大值
      expect(result.mergedData?.downloadCount).toBe(300);
    });

    it('应该正确合并 tags 数组', async () => {
      const existing = createExistingSkill();
      const incoming = createIncomingSkill();

      const result = await resolver.resolve(existing, incoming);

      const mergedTags = result.mergedData?.tags;
      expect(mergedTags).toContain('tag1');
      expect(mergedTags).toContain('tag2');
      expect(mergedTags).toContain('tag3');
    });
  });

  describe('场景M3补充: IDENTITY级别变更需要人工审核', () => {
    it('v2.0: author变更应标记需要审核', async () => {
      const existing = createExistingSkill({ source: 'skillsmp', author: '张三' });
      const incoming = createIncomingSkill({ source: 'smithery', author: '李四' });

      const result = await resolver.resolve(existing, incoming);

      // author是IDENTITY级别，变更应触发审核
      expect(result.requiresReview).toBeDefined();
      expect(result.requiresReview).toContain('author');
      expect(result.action).toBe('review');
    });

    it('v2.0: name变更应标记需要审核', async () => {
      const existing = createExistingSkill({ source: 'skillsmp' });
      const incoming = createIncomingSkill({ source: 'smithery', name: 'Completely Different Name' });

      const result = await resolver.resolve(existing, incoming);

      // name是IDENTITY级别
      expect(result.requiresReview).toBeDefined();
      expect(result.requiresReview).toContain('name');
    });
  });

  describe('字段变更级别追踪', () => {
    it('v2.0: 每个冲突应包含changeLevel', async () => {
      const existing = createExistingSkill({ source: 'smithery' });
      const incoming = createIncomingSkill({ source: 'skillsmp' });

      const result = await resolver.resolve(existing, incoming);

      expect(result.conflicts).toBeDefined();
      for (const conflict of result.conflicts!) {
        expect(conflict.changeLevel).toBeDefined();
        expect(Object.values(FieldChangeLevel)).toContain(conflict.changeLevel);
      }
    });
  });

  describe('空值处理', () => {
    it('incoming为空时应保留existing', async () => {
      const existing = createExistingSkill({ description: 'Existing description' });
      const incoming = createIncomingSkill({ description: '' });

      const result = await resolver.resolve(existing, incoming);

      expect(result.mergedData?.description).toBe('Existing description');
    });

    it('existing为空时应使用incoming', async () => {
      const existing = createExistingSkill({ description: '' });
      const incoming = createIncomingSkill({ description: 'New description' });

      const result = await resolver.resolve(existing, incoming);

      expect(result.mergedData?.description).toBe('New description');
    });
  });
});
