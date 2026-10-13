/**
 * Skill 适配器导出 v2.0
 * 新增：skills.sh, npm, GitHub 适配器
 */
export { BaseSkillAdapter } from './BaseAdapter.js';
export { SkillsMPAdapter } from './SkillsMPAdapter.js';
export { SmitheryAdapter } from './SmitheryAdapter.js';
export { SkillsShAdapter } from './SkillsShAdapter.js';
export { NpmAdapter } from './NpmAdapter.js';
export { GitHubAdapter } from './GitHubAdapter.js';
import { BaseSkillAdapter } from './BaseAdapter.js';
import { DataSourceConfig } from '../types/skill.js';
/**
 * 适配器工厂 v2.0
 * 支持5个数据源：skillsmp, smithery, skills_sh, npm, github
 */
export declare function createAdapter(config: DataSourceConfig): BaseSkillAdapter;
//# sourceMappingURL=index.d.ts.map