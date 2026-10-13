/**
 * NPM适配器 - 完整字段版本
 * 从npm registry获取数据并映射到82个字段
 */

import axios, { AxiosInstance } from 'axios';
import { Skill, createSkillWithDefaults } from '../types/skill-full.js';

interface NpmSearchResult {
  objects: Array<{
    package: {
      name: string;
      description?: string;
      version?: string;
      keywords?: string[];
      author?: { name?: string; email?: string; url?: string } | string;
      license?: string;
      links?: {
        npm?: string;
        homepage?: string;
        repository?: string;
        bugs?: string;
      };
      date?: string;
    };
    score?: {
      final?: number;
      detail?: {
        quality?: number;
        popularity?: number;
        maintenance?: number;
      };
    };
    searchScore?: number;
  }>;
  total: number;
}

interface NpmPackageDetail {
  name: string;
  description?: string;
  version?: string;
  keywords?: string[];
  author?: { name?: string; email?: string; url?: string } | string;
  license?: string;
  repository?: { url?: string; type?: string };
  homepage?: string;
  bugs?: { url?: string };
  time?: Record<string, string>;
  dist?: {
    unpackedSize?: number;
  };
  maintainers?: Array<{ name?: string; email?: string }>;
}

export class NpmAdapterFull {
  private client: AxiosInstance;
  private githubClient: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://registry.npmjs.org',
      timeout: 30000,
    });

    this.githubClient = axios.create({
      baseURL: 'https://api.github.com',
      timeout: 30000,
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    // 如果有GitHub Token，使用它
    if (process.env.GITHUB_TOKEN) {
      this.githubClient.defaults.headers.common['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }
  }

  /**
   * 搜索npm包
   */
  async search(query: string, limit: number = 100): Promise<Skill[]> {
    console.log(`  [NPM] 搜索: "${query}" (limit: ${limit})`);

    const response = await this.client.get<NpmSearchResult>(
      `/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`
    );

    const skills: Skill[] = [];

    for (const item of response.data.objects || []) {
      const pkg = item.package;
      if (!pkg?.name) continue;

      try {
        // 获取详细信息和GitHub数据
        const enriched = await this.enrichPackageData(pkg);
        skills.push(enriched);
      } catch (error) {
        console.warn(`  [NPM] 处理包 ${pkg.name} 失败:`, (error as Error).message);
      }
    }

    console.log(`  [NPM] 成功处理: ${skills.length} 个包`);
    return skills;
  }

  /**
   * 获取单个包的详细信息
   */
  async getPackage(name: string): Promise<Skill | null> {
    try {
      const response = await this.client.get<NpmPackageDetail>(`/${name}`);
      const pkg = response.data;

      // 转换为Skill格式
      return this.transformToSkill(pkg);
    } catch (error) {
      console.warn(`  [NPM] 获取包 ${name} 失败:`, (error as Error).message);
      return null;
    }
  }

  /**
   * 丰富包数据（获取GitHub信息）
   */
  private async enrichPackageData(pkg: NpmSearchResult['objects'][0]['package']): Promise<Skill> {
    const repoUrl = pkg.links?.repository || '';
    const githubMatch = repoUrl.match(/github\.com[/:]([^/]+)\/([^/\.]+)/);

    let githubData: {
      stars?: number;
      forks?: number;
      topics?: string[];
      language?: string;
      updatedAt?: string;
      license?: string;
      description?: string;
    } = {};

    if (githubMatch) {
      const [, owner, repo] = githubMatch;
      try {
        const [repoRes, topicsRes] = await Promise.all([
          this.githubClient.get(`/repos/${owner}/${repo}`).catch(() => null),
          this.githubClient.get(`/repos/${owner}/${repo}/topics`, {
            headers: { Accept: 'application/vnd.github.mercy-preview+json' }
          }).catch(() => null),
        ]);

        if (repoRes?.data) {
          githubData = {
            stars: repoRes.data.stargazers_count || 0,
            forks: repoRes.data.forks_count || 0,
            language: repoRes.data.language,
            updatedAt: repoRes.data.updated_at,
            license: repoRes.data.license?.spdx_id,
            description: repoRes.data.description,
          };
        }

        if (topicsRes?.data) {
          githubData.topics = topicsRes.data.names || [];
        }
      } catch {
        // GitHub API失败时忽略
      }
    }

    return this.transformToSkill(pkg, githubData);
  }

  /**
   * 将NPM包转换为Skill对象（完整82字段）
   */
  private transformToSkill(
    pkg: NpmSearchResult['objects'][0]['package'] | NpmPackageDetail,
    githubData: { stars?: number; forks?: number; topics?: string[]; language?: string; updatedAt?: string; license?: string; description?: string } = {}
  ): Skill {
    const repoUrl = 'links' in pkg ? pkg.links?.repository : pkg.repository?.url;
    const homepage = 'links' in pkg ? pkg.links?.homepage : pkg.homepage;
    const npmUrl = 'links' in pkg ? pkg.links?.npm : `https://www.npmjs.com/package/${pkg.name}`;

    // 解析作者信息
    let authorName: string | undefined;
    let authorUrl: string | undefined;
    if (pkg.author) {
      if (typeof pkg.author === 'string') {
        authorName = pkg.author;
      } else {
        authorName = pkg.author.name;
        authorUrl = pkg.author.url;
      }
    }

    // 合并keywords和topics
    const keywords = pkg.keywords || [];
    const allTags = [...new Set([...keywords, ...(githubData.topics || [])])];

    // 推断技能类型
    const skillType = this.inferSkillType(pkg.name, keywords, githubData.topics);

    // 推断分类
    const category = this.inferCategory(keywords, githubData.topics);

    // 推断支持的IDE
    const supportedIdes = this.inferSupportedIdes(pkg.name, keywords);

    // 推断编程语言
    const programmingLanguages = this.inferProgrammingLanguages(githubData.language, keywords);

    // 推断框架
    const frameworks = this.inferFrameworks(keywords);

    // 构建安装命令
    const installCmd = `npm install ${pkg.name}`;

    // 构建显示名称
    const displayName = this.formatDisplayName(pkg.name);

    return createSkillWithDefaults({
      // 3.1 核心信息
      name: pkg.name,
      displayName: displayName,
      description: githubData.description || pkg.description || `${pkg.name} - A skill package`,
      skillType: skillType,
      category: category,
      tags: allTags.slice(0, 20), // 限制标签数量

      // 3.2 作者与来源
      author: authorName,
      authorUrl: authorUrl,
      version: pkg.version,
      license: githubData.license || pkg.license,
      sourceType: 'community',

      // 3.3 技术配置
      protocol: 'anthropic',
      supportedIdes: supportedIdes,
      programmingLanguages: programmingLanguages,
      frameworks: frameworks,
      installCmd: installCmd,
      updateCmd: `npm update ${pkg.name}`,
      uninstallCmd: `npm uninstall ${pkg.name}`,

      // 3.6 链接与资源
      homepage: homepage,
      repository: repoUrl,
      documentation: homepage,
      readmeUrl: repoUrl ? `${repoUrl}#readme` : undefined,
      icon: `https://www.npmjs.com/${pkg.name}/avatar`,

      // 3.7 统计数据
      downloads: 0, // npm不提供下载量
      stars: githubData.stars || 0,

      // 3.10 同步信息
      syncSource: 'npm',
      lastUpdated: githubData.updatedAt ? new Date(githubData.updatedAt) : undefined,
    });
  }

  /**
   * 推断技能类型
   */
  private inferSkillType(name: string, keywords: string[], topics?: string[]): string {
    const allTerms = [...name.toLowerCase().split('-'), ...keywords.map(k => k.toLowerCase()), ...(topics || []).map(t => t.toLowerCase())];

    if (allTerms.some(t => ['code', 'coding', 'program', 'developer', 'ide', 'editor'].includes(t))) {
      return 'code';
    }
    if (allTerms.some(t => ['analysis', 'analyze', 'data', 'analytics', 'chart', 'graph'].includes(t))) {
      return 'analysis';
    }
    if (allTerms.some(t => ['create', 'creation', 'generate', 'generation', 'art', 'design', 'image'].includes(t))) {
      return 'creation';
    }
    if (allTerms.some(t => ['office', 'document', 'doc', 'pdf', 'excel', 'word'].includes(t))) {
      return 'office';
    }
    return 'utility';
  }

  /**
   * 推断分类
   */
  private inferCategory(keywords: string[], topics?: string[]): string {
    const allTerms = [...keywords.map(k => k.toLowerCase()), ...(topics || []).map(t => t.toLowerCase())];

    if (allTerms.some(t => ['ai', 'ml', 'machine-learning', 'llm', 'gpt', 'claude'].includes(t))) {
      return 'ai';
    }
    if (allTerms.some(t => ['web', 'frontend', 'react', 'vue', 'angular'].includes(t))) {
      return 'web';
    }
    if (allTerms.some(t => ['backend', 'server', 'api', 'database', 'db'].includes(t))) {
      return 'backend';
    }
    if (allTerms.some(t => ['devops', 'docker', 'kubernetes', 'ci', 'cd'].includes(t))) {
      return 'devops';
    }
    if (allTerms.some(t => ['testing', 'test', 'jest', 'mocha', 'cypress'].includes(t))) {
      return 'testing';
    }
    return 'general';
  }

  /**
   * 推断支持的IDE
   */
  private inferSupportedIdes(name: string, keywords: string[]): string[] {
    const ides: string[] = [];
    const allTerms = [name.toLowerCase(), ...keywords.map(k => k.toLowerCase())];

    if (allTerms.some(t => t.includes('vscode') || t.includes('vs-code'))) {
      ides.push('vscode');
    }
    if (allTerms.some(t => t.includes('jetbrains') || t.includes('idea') || t.includes('webstorm'))) {
      ides.push('idea');
    }
    if (allTerms.some(t => t.includes('cursor'))) {
      ides.push('cursor');
    }
    if (allTerms.some(t => t.includes('trae'))) {
      ides.push('trae');
    }
    if (allTerms.some(t => t.includes('vim') || t.includes('neovim'))) {
      ides.push('vim');
    }

    // 默认支持vscode
    if (ides.length === 0) {
      ides.push('vscode');
    }

    return ides;
  }

  /**
   * 推断编程语言
   */
  private inferProgrammingLanguages(primaryLanguage?: string, keywords: string[] = []): string[] {
    const languages: string[] = [];

    if (primaryLanguage) {
      languages.push(primaryLanguage.toLowerCase());
    }

    const keywordMap: Record<string, string> = {
      'typescript': 'typescript',
      'javascript': 'javascript',
      'python': 'python',
      'rust': 'rust',
      'go': 'go',
      'golang': 'go',
      'java': 'java',
      'csharp': 'csharp',
      'c#': 'csharp',
      'cpp': 'cpp',
      'c++': 'cpp',
      'ruby': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kotlin': 'kotlin',
    };

    for (const keyword of keywords.map(k => k.toLowerCase())) {
      if (keywordMap[keyword] && !languages.includes(keywordMap[keyword])) {
        languages.push(keywordMap[keyword]);
      }
    }

    // 默认JavaScript
    if (languages.length === 0) {
      languages.push('javascript');
    }

    return languages;
  }

  /**
   * 推断框架
   */
  private inferFrameworks(keywords: string[]): string[] {
    const frameworks: string[] = [];
    const frameworkKeywords: Record<string, string> = {
      'react': 'react',
      'vue': 'vue',
      'angular': 'angular',
      'svelte': 'svelte',
      'nextjs': 'nextjs',
      'nuxt': 'nuxt',
      'express': 'express',
      'fastify': 'fastify',
      'nestjs': 'nestjs',
      'django': 'django',
      'flask': 'flask',
      'fastapi': 'fastapi',
      'spring': 'spring',
      'laravel': 'laravel',
      'rails': 'rails',
    };

    for (const keyword of keywords.map(k => k.toLowerCase())) {
      if (frameworkKeywords[keyword] && !frameworks.includes(frameworkKeywords[keyword])) {
        frameworks.push(frameworkKeywords[keyword]);
      }
    }

    return frameworks;
  }

  /**
   * 格式化显示名称
   */
  private formatDisplayName(name: string): string {
    return name
      .replace(/^@[^/]+\//, '') // 移除scope
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
