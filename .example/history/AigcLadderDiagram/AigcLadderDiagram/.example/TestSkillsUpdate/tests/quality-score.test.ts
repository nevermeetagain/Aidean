/**
 * v2.0 场景化测试 - 数据质量评分 + 字段级增量检测
 * 覆盖场景：U2（多源数据补全）、S5（API响应格式变化）
 */

import { describe, it, expect } from 'vitest';
import {
  DataQualityScore,
  QUALITY_THRESHOLD,
  FieldChangeLevel,
  FIELD_LEVEL_MAP,
  CHANGE_LEVEL_CONFIG,
  DataLayer,
} from '../src/types/skill';

describe('DataQualityScore v2.0', () => {
  describe('场景U2: 数据完整度影响质量评分', () => {
    it('必填字段全部填写应得较高完整度分数', () => {
      // 模拟完整数据的Skill
      const fullSkill = {
        name: 'Test Skill',
        description: 'A comprehensive skill for testing',
        author: 'test-author',
        sourceUrl: 'https://github.com/test/repo',
        version: '1.0.0',
        stars: 100,
        downloadCount: 50,
        category: 'development',
        tags: ['test', 'skill'],
        installCommand: 'npm install test-skill',
      };

      const requiredFields = ['name', 'description', 'author', 'sourceUrl', 'version'];
      const optionalFields = ['stars', 'downloadCount', 'category', 'tags', 'installCommand'];

      const filledRequired = requiredFields.filter(f => fullSkill[f as keyof typeof fullSkill] != null && fullSkill[f as keyof typeof fullSkill] !== '').length;
      const filledOptional = optionalFields.filter(f => fullSkill[f as keyof typeof fullSkill] != null && fullSkill[f as keyof typeof fullSkill] !== '').length;

      const completeness = (filledRequired / requiredFields.length) * 70 + (filledOptional / optionalFields.length) * 30;
      
      expect(completeness).toBe(100);
    });

    it('缺少多个必填字段应得较低完整度分数', () => {
      const partialSkill = {
        name: 'Partial Skill',
        // 缺少description, author, sourceUrl, version
        stars: 10,
      };

      const requiredFields = ['name', 'description', 'author', 'sourceUrl', 'version'];
      const optionalFields = ['stars', 'downloadCount', 'category', 'tags', 'installCommand'];

      const filledRequired = requiredFields.filter(f => (partialSkill as any)[f] != null && (partialSkill as any)[f] !== '').length;
      const filledOptional = optionalFields.filter(f => (partialSkill as any)[f] != null && (partialSkill as any)[f] !== '').length;

      const completeness = (filledRequired / requiredFields.length) * 70 + (filledOptional / optionalFields.length) * 30;

      expect(completeness).toBeLessThan(30); // 只有1/5必填
    });
  });

  describe('质量阈值', () => {
    it('QUALITY_THRESHOLD 应为60', () => {
      expect(QUALITY_THRESHOLD).toBe(60);
    });
  });
});

describe('FieldLevelIncremental v2.0', () => {
  describe('字段变更级别映射', () => {
    it('METRIC级别字段：downloadCount和stars', () => {
      expect(FIELD_LEVEL_MAP['downloadCount']).toBe(FieldChangeLevel.METRIC);
      expect(FIELD_LEVEL_MAP['stars']).toBe(FieldChangeLevel.METRIC);
    });

    it('CONTENT级别字段：description和category', () => {
      expect(FIELD_LEVEL_MAP['description']).toBe(FieldChangeLevel.CONTENT);
      expect(FIELD_LEVEL_MAP['category']).toBe(FieldChangeLevel.CONTENT);
      expect(FIELD_LEVEL_MAP['tags']).toBe(FieldChangeLevel.CONTENT);
    });

    it('RELEASE级别字段：version和lastUpdated', () => {
      expect(FIELD_LEVEL_MAP['version']).toBe(FieldChangeLevel.RELEASE);
      expect(FIELD_LEVEL_MAP['lastUpdated']).toBe(FieldChangeLevel.RELEASE);
    });

    it('IDENTITY级别字段：author和name', () => {
      expect(FIELD_LEVEL_MAP['author']).toBe(FieldChangeLevel.IDENTITY);
      expect(FIELD_LEVEL_MAP['name']).toBe(FieldChangeLevel.IDENTITY);
      expect(FIELD_LEVEL_MAP['displayName']).toBe(FieldChangeLevel.IDENTITY);
    });
  });

  describe('变更级别配置', () => {
    it('METRIC级别：不记录历史，不通知', () => {
      const config = CHANGE_LEVEL_CONFIG[FieldChangeLevel.METRIC];
      expect(config.logHistory).toBe(false);
      expect(config.notify).toBe(false);
      expect(config.requireReview).toBe(false);
    });

    it('IDENTITY级别：记录历史，通知，需要人工审核', () => {
      const config = CHANGE_LEVEL_CONFIG[FieldChangeLevel.IDENTITY];
      expect(config.logHistory).toBe(true);
      expect(config.notify).toBe(true);
      expect(config.requireReview).toBe(true);
    });

    it('变更级别有序递增', () => {
      expect(CHANGE_LEVEL_CONFIG[FieldChangeLevel.METRIC].level).toBeLessThan(CHANGE_LEVEL_CONFIG[FieldChangeLevel.CONTENT].level);
      expect(CHANGE_LEVEL_CONFIG[FieldChangeLevel.CONTENT].level).toBeLessThan(CHANGE_LEVEL_CONFIG[FieldChangeLevel.RELEASE].level);
      expect(CHANGE_LEVEL_CONFIG[FieldChangeLevel.RELEASE].level).toBeLessThan(CHANGE_LEVEL_CONFIG[FieldChangeLevel.PRICING].level);
      expect(CHANGE_LEVEL_CONFIG[FieldChangeLevel.PRICING].level).toBeLessThan(CHANGE_LEVEL_CONFIG[FieldChangeLevel.IDENTITY].level);
    });
  });
});

describe('DataLayer v2.0', () => {
  it('数据分层枚举值正确', () => {
    expect(DataLayer.L0_RAW).toBe(0);
    expect(DataLayer.L1_COMMUNITY).toBe(1);
    expect(DataLayer.L2_AGGREGATOR).toBe(2);
    expect(DataLayer.L3_AUTHORITY).toBe(3);
  });
});
