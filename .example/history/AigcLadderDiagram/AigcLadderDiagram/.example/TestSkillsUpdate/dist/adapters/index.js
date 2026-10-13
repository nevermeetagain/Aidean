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
import { SkillsMPAdapter } from './SkillsMPAdapter.js';
import { SmitheryAdapter } from './SmitheryAdapter.js';
import { SkillsShAdapter } from './SkillsShAdapter.js';
import { NpmAdapter } from './NpmAdapter.js';
import { GitHubAdapter } from './GitHubAdapter.js';
/**
 * 适配器工厂 v2.0
 * 支持5个数据源：skillsmp, smithery, skills_sh, npm, github
 */
export function createAdapter(config) {
    switch (config.sourceCode) {
        case 'skillsmp':
            return new SkillsMPAdapter(config);
        case 'smithery':
            return new SmitheryAdapter(config);
        case 'skills_sh':
            return new SkillsShAdapter(config);
        case 'npm':
            return new NpmAdapter(config);
        case 'github':
            return new GitHubAdapter(config);
        default:
            throw new Error(`Unknown data source: ${config.sourceCode}`);
    }
}
//# sourceMappingURL=index.js.map