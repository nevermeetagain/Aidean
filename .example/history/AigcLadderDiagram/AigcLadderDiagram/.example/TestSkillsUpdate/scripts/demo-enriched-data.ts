/**
 * 演示：获取增强版数据（含 GitHub stars/topics）
 */

import axios from 'axios';

async function demo() {
  console.log('========================================');
  console.log('增强版数据获取演示');
  console.log('========================================\n');

  // 1. 从 npm 搜索
  console.log('【1. npm 搜索】');
  const npmResponse = await axios.get('https://registry.npmjs.org/-/v1/search', {
    params: { text: 'mcp-server', size: 5 }
  });
  
  const packages = npmResponse.data.objects || [];
  console.log(`找到 ${packages.length} 个包\n`);

  // 2. 为每个包获取 GitHub 数据
  console.log('【2. GitHub 数据补充】\n');
  
  for (const pkg of packages) {
    const npmPkg = pkg.package;
    console.log(`--- ${npmPkg.name} ---`);
    console.log(`  npm 描述: ${npmPkg.description?.substring(0, 60) || 'N/A'}...`);
    console.log(`  npm 版本: ${npmPkg.version}`);
    console.log(`  npm keywords: ${JSON.stringify(npmPkg.keywords || [])}`);
    
    // 解析 GitHub 仓库
    const repoUrl = npmPkg.links?.repository || npmPkg.repository?.url || '';
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/\.]+)/);
    
    if (match) {
      const [, owner, repo] = match;
      console.log(`  GitHub: ${owner}/${repo}`);
      
      try {
        // 获取 GitHub 数据
        const [repoRes, topicsRes] = await Promise.all([
          axios.get(`https://api.github.com/repos/${owner}/${repo}`, { timeout: 5000 }).catch(() => null),
          axios.get(`https://api.github.com/repos/${owner}/${repo}/topics`, {
            headers: { Accept: 'application/vnd.github.mercy-preview+json' },
            timeout: 5000
          }).catch(() => null),
        ]);
        
        if (repoRes?.data) {
          console.log(`  ⭐ Stars: ${repoRes.data.stargazers_count || 0}`);
          console.log(`  🍴 Forks: ${repoRes.data.forks_count || 0}`);
          console.log(`  💻 语言: ${repoRes.data.language || 'N/A'}`);
          console.log(`  👁️ Watchers: ${repoRes.data.watchers_count || 0}`);
        } else {
          console.log('  ⚠️ 无法获取 GitHub 数据');
        }
        
        if (topicsRes?.data?.names) {
          console.log(`  🏷️ Topics: ${JSON.stringify(topicsRes.data.names)}`);
        }
      } catch (e) {
        console.log('  ⚠️ GitHub API 错误');
      }
    } else {
      console.log('  ⚠️ 无 GitHub 仓库链接');
    }
    
    console.log('');
  }

  // 3. 对比总结
  console.log('【3. 数据对比总结】\n');
  console.log('npm 搜索 API 提供：');
  console.log('  ✅ 包名、描述、版本');
  console.log('  ✅ npm keywords');
  console.log('  ❌ Stars 数');
  console.log('  ❌ 下载量');
  console.log('  ❌ 分类/Topics\n');
  
  console.log('GitHub API 补充：');
  console.log('  ✅ Stars、Forks、Watchers');
  console.log('  ✅ Topics（作为分类和标签）');
  console.log('  ✅ 主要编程语言');
  console.log('  ✅ 最后更新时间\n');

  console.log('========================================');
  console.log('演示完成');
  console.log('========================================');
}

demo().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
