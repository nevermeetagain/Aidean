// 资源页面翻译 - 注意：所有属性名前加page避免与translations冲突
export const resourcesTranslations = {
  zh: {
    // AI快讯页面
    newsPage: {
      title: "AI快讯",
      subtitle: "最新AI资讯与行业动态",
      description: "汇集全球最新AI技术突破、产品发布、行业政策等资讯",
      badge: "AI资讯",
      categories: {
        all: "全部",
        tech: "技术突破",
        product: "产品发布",
        policy: "政策法规",
        industry: "行业动态",
      },
      filter: {
        allCategories: "全部分类",
        latest: "最新发布",
        popular: "热门阅读",
      },
      readMore: "阅读全文",
      loadMore: "加载更多",
      noMore: "没有更多内容了",
      empty: "暂无相关资讯",
      searchPlaceholder: "搜索资讯...",
      stats: "共 {count} 条资讯",
    },
    // 场景方案页面
    scenarios: {
      title: "场景方案",
      subtitle: "AI应用场景与解决方案",
      description: "探索AI技术在各行业的实际应用案例与解决方案",
      badge: "场景方案",
      categories: {
        all: "全部场景",
        office: "办公场景",
        marketing: "营销场景",
        development: "开发场景",
        data: "数据场景",
        customer: "客服场景",
      },
      filter: {
        allCategories: "全部分类",
        newest: "最新方案",
        mostUsed: "最多使用",
      },
      scenarios: {
        smartOffice: {
          title: "智能办公助手",
          desc: "自动化文档处理、会议纪要生成、智能日程管理",
          tags: ["办公", "效率"],
        },
        contentMarketing: {
          title: "内容营销自动化",
          desc: "智能文案生成、社媒内容规划、营销效果分析",
          tags: ["营销", "内容"],
        },
        codeReview: {
          title: "智能代码审查",
          desc: "自动化代码质量检查、安全漏洞扫描、性能优化建议",
          tags: ["开发", "代码"],
        },
        dataAnalysis: {
          title: "业务数据分析",
          desc: "销售数据分析、用户行为洞察、经营决策支持",
          tags: ["数据", "分析"],
        },
        customerService: {
          title: "智能客服系统",
          desc: "多渠道客户接待、问题自动分配、服务质量监控",
          tags: ["客服", "服务"],
        },
      },
      loadMore: "加载更多方案",
      viewDetail: "查看详情",
    },
    // Agent集合页面
    agent: {
      title: "Agent集合",
      subtitle: "AI Agent工具与应用",
      description: "发现和体验各类AI Agent工具，提升工作效率",
      badge: "Agent",
      categories: {
        all: "全部",
        productivity: "生产力",
        creative: "创意",
        research: "研究",
        lifestyle: "生活",
      },
      filter: {
        allCategories: "全部分类",
        rating: "评分最高",
        newest: "最新发布",
        popular: "最受欢迎",
      },
      stats: {
        total: "共 {count} 个Agent",
        rating: "评分",
        usage: "使用次数",
      },
      actions: {
        tryNow: "立即试用",
        favorite: "收藏",
        detail: "查看详情",
      },
    },
    // MCP工具页面
    mcp: {
      title: "MCP工具",
      subtitle: "模型上下文协议工具集",
      description: "发现和使用MCP工具，扩展AI模型能力边界",
      badge: "MCP",
      categories: {
        all: "全部",
        search: "搜索",
        database: "数据库",
        api: "API",
        file: "文件",
        system: "系统",
      },
      filter: {
        allCategories: "全部分类",
        newest: "最新发布",
        popular: "最受欢迎",
      },
      stats: {
        total: "共 {count} 个MCP工具",
        compatible: "兼容模型",
        usage: "使用次数",
      },
      actions: {
        tryNow: "立即试用",
        install: "安装",
        detail: "查看详情",
      },
    },
    // Skill技能页面
    skills: {
      title: "Skill技能",
      subtitle: "AI技能与能力扩展",
      description: "发现和掌握各类AI技能，解锁AI无限可能",
      badge: "Skill",
      categories: {
        all: "全部",
        writing: "写作",
        coding: "编程",
        analysis: "分析",
        design: "设计",
        communication: "沟通",
      },
      filter: {
        allCategories: "全部分类",
        newest: "最新技能",
        popular: "热门技能",
        recommended: "推荐技能",
      },
      stats: {
        total: "共 {count} 个Skill",
        level: "难度等级",
        users: "学习人数",
      },
      actions: {
        learn: "学习",
        practice: "练习",
        favorite: "收藏",
      },
    },
  },
  en: {
    // AI快讯页面
    newsPage: {
      title: "AI News",
      subtitle: "Latest AI News & Industry Updates",
      description: "Global AI technology breakthroughs, product releases, and industry policies",
      badge: "AI News",
      categories: {
        all: "All",
        tech: "Tech Breakthrough",
        product: "Product Release",
        policy: "Policy",
        industry: "Industry",
      },
      filter: {
        allCategories: "All Categories",
        latest: "Latest",
        popular: "Popular",
      },
      readMore: "Read More",
      loadMore: "Load More",
      noMore: "No More Content",
      empty: "No Related News",
      searchPlaceholder: "Search news...",
      stats: "{count} news items",
    },
    // 场景方案页面
    scenarios: {
      title: "Scenarios",
      subtitle: "AI Application Scenarios & Solutions",
      description: "Explore real-world AI applications and solutions across industries",
      badge: "Scenarios",
      categories: {
        all: "All Scenarios",
        office: "Office",
        marketing: "Marketing",
        development: "Development",
        data: "Data",
        customer: "Customer Service",
      },
      filter: {
        allCategories: "All Categories",
        newest: "Newest",
        mostUsed: "Most Used",
      },
      scenarios: {
        smartOffice: {
          title: "Smart Office Assistant",
          desc: "Automated document processing, meeting notes generation, smart scheduling",
          tags: ["Office", "Productivity"],
        },
        contentMarketing: {
          title: "Content Marketing Automation",
          desc: "Smart copywriting, social media planning, marketing analytics",
          tags: ["Marketing", "Content"],
        },
        codeReview: {
          title: "Smart Code Review",
          desc: "Automated code quality checks, security scanning, performance optimization",
          tags: ["Development", "Code"],
        },
        dataAnalysis: {
          title: "Business Data Analysis",
          desc: "Sales data analysis, user behavior insights, business decision support",
          tags: ["Data", "Analysis"],
        },
        customerService: {
          title: "Smart Customer Service",
          desc: "Multi-channel support, auto ticket routing, service quality monitoring",
          tags: ["Customer Service", "Support"],
        },
      },
      loadMore: "Load More",
      viewDetail: "View Details",
    },
    // Agent集合页面
    agent: {
      title: "Agent Collection",
      subtitle: "AI Agent Tools & Applications",
      description: "Discover and experience various AI Agent tools to boost productivity",
      badge: "Agent",
      categories: {
        all: "All",
        productivity: "Productivity",
        creative: "Creative",
        research: "Research",
        lifestyle: "Lifestyle",
      },
      filter: {
        allCategories: "All Categories",
        rating: "Highest Rated",
        newest: "Newest",
        popular: "Most Popular",
      },
      stats: {
        total: "{count} Agents",
        rating: "Rating",
        usage: "Usage",
      },
      actions: {
        tryNow: "Try Now",
        favorite: "Favorite",
        detail: "Details",
      },
    },
    // MCP工具页面
    mcp: {
      title: "MCP Tools",
      subtitle: "Model Context Protocol Tools",
      description: "Discover and use MCP tools to extend AI model capabilities",
      badge: "MCP",
      categories: {
        all: "All",
        search: "Search",
        database: "Database",
        api: "API",
        file: "File",
        system: "System",
      },
      filter: {
        allCategories: "All Categories",
        newest: "Newest",
        popular: "Most Popular",
      },
      stats: {
        total: "{count} MCP Tools",
        compatible: "Compatible Models",
        usage: "Usage",
      },
      actions: {
        tryNow: "Try Now",
        install: "Install",
        detail: "Details",
      },
    },
    // Skill技能页面
    skills: {
      title: "Skill Skills",
      subtitle: "AI Skills & Capability Extensions",
      description: "Discover and master various AI skills to unlock unlimited possibilities",
      badge: "Skill",
      categories: {
        all: "All",
        writing: "Writing",
        coding: "Coding",
        analysis: "Analysis",
        design: "Design",
        communication: "Communication",
      },
      filter: {
        allCategories: "All Categories",
        newest: "Newest",
        popular: "Popular",
        recommended: "Recommended",
      },
      stats: {
        total: "{count} Skills",
        level: "Difficulty",
        users: "Learners",
      },
      actions: {
        learn: "Learn",
        practice: "Practice",
        favorite: "Favorite",
      },
    },
  },
} as const;

export type ResourcesTranslation = typeof resourcesTranslations.zh;
