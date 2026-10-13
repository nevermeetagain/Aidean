-- ============================================================
-- Aidean IDE/CLI Agent系统 - 种子数据脚本
-- 13_seed_agent_data.sql
-- 功能：添加初始文档模板和配置
-- ============================================================

-- ============================================================
-- 1. 文档模板种子数据
-- ============================================================

-- 通用论文模板
INSERT INTO doc_templates (id, code, name, description, type, format_rules, structure, is_default, is_public, is_active)
VALUES (
    'temp_' || gen_random_uuid()::text,
    'paper_generic',
    '通用学术论文模板',
    '适用于大多数学术期刊和会议的论文格式',
    'PAPER',
    '{
        "pageSize": "A4",
        "margins": {"top": 2.54, "bottom": 2.54, "left": 3.17, "right": 3.17},
        "font": {"body": "Times New Roman 12pt", "heading": "黑体 14pt"},
        "lineSpacing": 1.5,
        "headingNumbering": "1.1.1",
        "citationStyle": "GB/T 7714-2015"
    }'::jsonb,
    '[
        {"section": "abstract", "title": "摘要", "required": true, "wordCount": [300, 500]},
        {"section": "keywords", "title": "关键词", "required": true},
        {"section": "introduction", "title": "引言", "required": true},
        {"section": "methodology", "title": "研究方法", "required": true},
        {"section": "results", "title": "实验结果", "required": true},
        {"section": "discussion", "title": "讨论", "required": true},
        {"section": "conclusion", "title": "结论", "required": true},
        {"section": "references", "title": "参考文献", "required": true},
        {"section": "acknowledgments", "title": "致谢", "required": false}
    ]'::jsonb,
    TRUE, TRUE, TRUE
);

-- 本科毕业论文模板
INSERT INTO doc_templates (id, code, name, description, type, institution, format_rules, structure, is_public, is_active)
VALUES (
    'temp_' || gen_random_uuid()::text,
    'paper_bachelor',
    '本科毕业论文模板',
    '符合国家标准GB/T 7713.1-2006的本科毕业论文格式',
    'PAPER',
    '通用高校',
    '{
        "pageSize": "A4",
        "margins": {"top": 2.54, "bottom": 2.54, "left": 3.17, "right": 3.17},
        "font": {"body": "宋体 小四", "heading": "黑体 三号"},
        "lineSpacing": 1.5,
        "headingNumbering": "第一章、1.1、1.1.1",
        "citationStyle": "GB/T 7714-2015",
        "coverPage": {
            "title": "本科毕业论文",
            "fields": ["学校名称", "论文题目", "学院", "专业", "学生姓名", "学号", "指导教师", "完成日期"]
        }
    }'::jsonb,
    '[
        {"section": "cover", "title": "封面", "required": true},
        {"section": "declaration", "title": "原创性声明", "required": true},
        {"section": "abstract_cn", "title": "中文摘要", "required": true, "wordCount": [300, 500]},
        {"section": "abstract_en", "title": "英文摘要", "required": true, "wordCount": [250, 400]},
        {"section": "toc", "title": "目录", "required": true},
        {"section": "introduction", "title": "绪论", "required": true},
        {"section": "chapters", "title": "正文章节", "required": true},
        {"section": "conclusion", "title": "结论", "required": true},
        {"section": "references", "title": "参考文献", "required": true},
        {"section": "acknowledgments", "title": "致谢", "required": true},
        {"section": "appendix", "title": "附录", "required": false}
    ]'::jsonb,
    TRUE, TRUE
);

-- 硕士毕业论文模板
INSERT INTO doc_templates (id, code, name, description, type, institution, format_rules, structure, is_public, is_active)
VALUES (
    'temp_' || gen_random_uuid()::text,
    'paper_master',
    '硕士毕业论文模板',
    '符合国家标准GB/T 7713.1-2006的硕士学位论文格式',
    'PAPER',
    '通用高校',
    '{
        "pageSize": "A4",
        "margins": {"top": 2.54, "bottom": 2.54, "left": 3.17, "right": 3.17},
        "font": {"body": "宋体 小四", "heading": "黑体 三号"},
        "lineSpacing": 1.5,
        "headingNumbering": "第一章、1.1、1.1.1",
        "citationStyle": "GB/T 7714-2015",
        "coverPage": {
            "title": "硕士学位论文",
            "fields": ["学校名称", "论文题目", "学院", "专业", "研究生姓名", "学号", "指导教师", "完成日期"]
        }
    }'::jsonb,
    '[
        {"section": "cover", "title": "封面", "required": true},
        {"section": "declaration", "title": "原创性声明和使用授权说明", "required": true},
        {"section": "abstract_cn", "title": "中文摘要", "required": true, "wordCount": [500, 1000]},
        {"section": "abstract_en", "title": "英文摘要", "required": true, "wordCount": [400, 800]},
        {"section": "toc", "title": "目录", "required": true},
        {"section": "table_list", "title": "图表清单", "required": true},
        {"section": "introduction", "title": "绪论", "required": true},
        {"section": "literature_review", "title": "文献综述", "required": true},
        {"section": "methodology", "title": "研究方法", "required": true},
        {"section": "results", "title": "研究结果与分析", "required": true},
        {"section": "conclusion", "title": "结论与展望", "required": true},
        {"section": "references", "title": "参考文献", "required": true},
        {"section": "achievements", "title": "攻读学位期间取得的成果", "required": false},
        {"section": "acknowledgments", "title": "致谢", "required": true}
    ]'::jsonb,
    TRUE, TRUE
);

-- 技术报告模板
INSERT INTO doc_templates (id, code, name, description, type, format_rules, structure, is_public, is_active)
VALUES (
    'temp_' || gen_random_uuid()::text,
    'report_technical',
    '技术报告模板',
    '适用于技术方案、架构设计、代码评审等技术文档',
    'REPORT',
    '{
        "pageSize": "A4",
        "margins": {"top": 2.54, "bottom": 2.54, "left": 2.54, "right": 2.54},
        "font": {"body": "Arial 11pt", "heading": "Arial Bold 14pt"},
        "lineSpacing": 1.15,
        "codeBlock": {"font": "Consolas 10pt", "background": "#f5f5f5"}
    }'::jsonb,
    '[
        {"section": "metadata", "title": "文档信息", "required": true},
        {"section": "summary", "title": "执行摘要", "required": true},
        {"section": "background", "title": "背景与问题", "required": true},
        {"section": "solution", "title": "解决方案", "required": true},
        {"section": "implementation", "title": "实现细节", "required": true},
        {"section": "testing", "title": "测试验证", "required": false},
        {"section": "deployment", "title": "部署计划", "required": false},
        {"section": "risks", "title": "风险评估", "required": true},
        {"section": "timeline", "title": "时间线", "required": true},
        {"section": "conclusion", "title": "总结", "required": true}
    ]'::jsonb,
    TRUE, TRUE
);

-- 深度研究报告模板
INSERT INTO doc_templates (id, code, name, description, type, format_rules, structure, is_public, is_active)
VALUES (
    'temp_' || gen_random_uuid()::text,
    'report_research',
    '深度研究报告模板',
    '基于本地和网络文献的深度研究报告格式',
    'REPORT',
    '{
        "pageSize": "A4",
        "margins": {"top": 2.54, "bottom": 2.54, "left": 3.17, "right": 3.17},
        "font": {"body": "Times New Roman 12pt", "heading": "黑体 14pt"},
        "lineSpacing": 1.5,
        "citationStyle": "GB/T 7714-2015"
    }'::jsonb,
    '[
        {"section": "title", "title": "标题页", "required": true},
        {"section": "abstract", "title": "摘要", "required": true, "wordCount": [500, 800]},
        {"section": "keywords", "title": "关键词", "required": true},
        {"section": "introduction", "title": "研究背景与意义", "required": true},
        {"section": "literature", "title": "文献综述", "required": true},
        {"section": "methodology", "title": "研究方法与数据来源", "required": true},
        {"section": "analysis", "title": "分析与讨论", "required": true},
        {"section": "findings", "title": "研究发现", "required": true},
        {"section": "conclusion", "title": "结论与建议", "required": true},
        {"section": "references", "title": "参考文献", "required": true},
        {"section": "appendix", "title": "附录", "required": false}
    ]'::jsonb,
    TRUE, TRUE
);

-- ============================================================
-- 2. 文档模板注释
-- ============================================================

COMMENT ON TABLE doc_templates IS '文档模板表：论文格式、学校模板、样式配置';
COMMENT ON TABLE user_templates IS '用户模板收藏表：自定义配置、收藏管理';

-- ============================================================
-- 3. 更新统计
-- ============================================================

SELECT '文档模板种子数据插入完成' AS status, COUNT(*) AS template_count FROM doc_templates;
