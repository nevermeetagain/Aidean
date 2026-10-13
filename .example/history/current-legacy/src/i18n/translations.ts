// 全局翻译文件 - 导航和通用内容
export const translations = {
  zh: {
    // 导航栏
    nav: {
      home: "首页",
      models: "Aidean",
      resources: "AideanSpace",
      products: "Sphere",
      docs: "文档",
      about: "关于",
    },
    // 二级导航 - 模型
    models: {
      ladder: "模型天梯图",
      mobile: "移动端模型天梯图",
      image: "图像模型天梯图",
      video: "视频模型天梯图",
      audio: "音频模型天梯图",
    },
    // 二级导航 - 资源
    resources: {
      news: "AI快讯",
      scenarios: "场景方案",
      agent: "Agent集合",
      mcp: "MCP工具",
      skills: "Skill技能",
    },
    // 二级导航 - 产品
    productItems: {
      aiEmployee: "数字分身",
      knowledgeBase: "知识库",
      solutions: "解决方案",
      consulting: "业务咨询",
    },
    // 二级导航 - 文档
    docs: {
      help: "使用指南",
      helpCenter: "帮助中心",
      pricing: "定价方案",
      api: "API文档",
    },
    // 二级导航 - 关于
    about: {
      cooperation: "合作",
      jobs: "招聘",
      contact: "联系我们",
    },
    // 通用
    common: {
      back: "返回",
      backToProducts: "返回产品列表",
      backToResources: "返回资源列表",
      contactUs: "联系我们",
      learnMore: "了解更多",
      startTrial: "开始免费试用",
      bookConsultation: "预约咨询",
      search: "搜索模型名称、厂商、标签...",
      login: "登录/注册",
    },
  },
  en: {
    // 导航栏
    nav: {
      home: "Home",
      models: "Aidean",
      resources: "AideanSpace",
      products: "Sphere",
      docs: "Docs",
      about: "About",
    },
    // 二级导航 - 模型
    models: {
      ladder: "Model Ladder",
      mobile: "Mobile Model Ladder",
      image: "Image Model Ladder",
      video: "Video Model Ladder",
      audio: "Audio Model Ladder",
    },
    // 二级导航 - 资源
    resources: {
      news: "AI News",
      scenarios: "Scenarios",
      agent: "Agent Collection",
      mcp: "MCP Tools",
      skills: "Skill Skills",
    },
    // 二级导航 - 产品
    productItems: {
      aiEmployee: "Digital Twin",
      knowledgeBase: "Knowledge Base",
      solutions: "Solutions",
      consulting: "Consulting",
    },
    // 二级导航 - 文档
    docs: {
      help: "User Guide",
      helpCenter: "Help Center",
      pricing: "Pricing",
      api: "API Docs",
    },
    // 二级导航 - 关于
    about: {
      cooperation: "Cooperation",
      jobs: "Careers",
      contact: "Contact Us",
    },
    // 通用
    common: {
      back: "Back",
      backToProducts: "Back to Products",
      backToResources: "Back to Resources",
      contactUs: "Contact Us",
      learnMore: "Learn More",
      startTrial: "Start Free Trial",
      bookConsultation: "Book Consultation",
      search: "Search models, vendors, tags...",
      login: "Sign In",
    },
  },
} as const;

// Lang类型与SiteLang保持一致
export type Lang = "zh" | "en" | "ja";
export type Translation = typeof translations.zh;
