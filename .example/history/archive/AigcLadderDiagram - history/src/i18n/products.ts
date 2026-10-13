// 产品页面翻译
export const productsTranslations = {
  zh: {
    // AI员工页面
    aiEmployee: {
      title: "AI员工",
      subtitle: "智能AI员工，助力企业数字化转型",
      description: "基于大语言模型的智能员工，可胜任客服、内容创作、编程等多种岗位",
      badge: "AI员工",
      employees: {
        customerService: {
          name: "AI智能客服",
          desc: "7x24小时智能客服，理解用户问题，提供即时、准确的回答",
          capabilities: ["多轮对话", "情绪识别", "工单创建", "知识库联动"],
          scenarios: ["电商客服", "售后支持", "咨询热线"],
        },
        contentWriter: {
          name: "AI内容创作",
          desc: "多场景内容创作助手，自动生成高质量文案、报告、邮件",
          capabilities: ["文案写作", "SEO优化", "多语言翻译", "风格定制"],
          scenarios: ["营销推广", "内容运营", "品牌传播"],
        },
        codeAssistant: {
          name: "AI编程助手",
          desc: "多语言编程助手，代码补全、Bug修复、重构、文档生成",
          capabilities: ["代码补全", "Bug检测", "代码重构", "文档生成"],
          scenarios: ["软件开发", "代码审查", "技术文档"],
        },
        dataAnalyst: {
          name: "AI数据分析师",
          desc: "智能数据分析助手，快速处理数据、生成报告、洞察业务价值",
          capabilities: ["数据清洗", "趋势分析", "报告生成", "异常检测"],
          scenarios: ["业务分析", "市场调研", "运营监控"],
        },
      },
      labels: {
        capabilities: "核心能力",
        scenarios: "适用场景",
      },
      features: {
        fastDeploy: { title: "快速部署", desc: "分钟级上线，无需复杂配置" },
        enterpriseSecurity: { title: "企业级安全", desc: "数据加密，权限管控，合规保障" },
        service24_7: { title: "7x24服务", desc: "全天候在线，永不掉线" },
        continuousLearning: { title: "持续学习", desc: "自动优化，越用越智能" },
      },
      steps: {
        title: "三步入职AI员工",
        step1: { title: "选择角色", desc: "根据业务需求选择合适的AI员工类型" },
        step2: { title: "配置知识库", desc: "上传企业专属知识，定制回答风格" },
        step3: { title: "开始工作", desc: "一键部署，AI员工立即投入工作" },
      },
      cta: {
        title: "准备好雇佣AI员工了吗？",
        desc: "立即开始免费试用，体验AI带来的效率提升",
      },
    },
    // 解决方案页面
    solutions: {
      title: "行业解决方案",
      subtitle: "行业定制AI解决方案",
      description: "深耕金融、制造、医疗、教育等行业，提供端到端AI落地服务",
      badge: "解决方案",
      industries: {
        finance: {
          name: "金融服务",
          desc: "智能风控、智能客服、合规审查等全场景AI解决方案",
          features: ["智能风控", "智能客服", "合规审查", "投研助手"],
        },
        manufacturing: {
          name: "智能制造",
          desc: "质量检测、预测性维护、供应链优化等工业AI应用",
          features: ["质量检测", "预测性维护", "供应链优化", "生产排程"],
        },
        healthcare: {
          name: "医疗健康",
          desc: "AI辅助诊断、病历分析、药物研发等医疗智能化方案",
          features: ["AI辅助诊断", "病历分析", "药物研发", "健康管理"],
        },
        education: {
          name: "智慧教育",
          desc: "个性化学习、自动批改、课程推荐等教育AI应用",
          features: ["个性化学习", "自动批改", "课程推荐", "学情分析"],
        },
        retail: {
          name: "零售电商",
          desc: "商品推荐、库存管理、价格优化等零售智能化方案",
          features: ["商品推荐", "库存管理", "价格优化", "客户分析"],
        },
        travel: {
          name: "旅游酒店",
          desc: "行程规划、动态定价、客户体验等旅游AI应用",
          features: ["行程规划", "动态定价", "客户体验", "运营优化"],
        },
      },
      process: {
        title: "实施流程",
        step1: { title: "需求评估", desc: "深入了解业务场景与痛点" },
        step2: { title: "方案设计", desc: "量身定制AI解决方案" },
        step3: { title: "POC验证", desc: "小规模试点验证效果" },
        step4: { title: "部署上线", desc: "全面部署，平稳上线" },
        step5: { title: "持续优化", desc: "长期跟踪，持续改进" },
      },
      advantages: {
        title: "技术优势",
        customDev: { title: "定制开发", desc: "根据需求量身定制，不是简单套模板" },
        enterpriseArch: { title: "企业级架构", desc: "高可用、高并发、可扩展的架构设计" },
        dataSecurity: { title: "数据安全", desc: "私有化部署，数据不出域，合规保障" },
        continuousSupport: { title: "持续支持", desc: "7x24技术支持，快速响应" },
      },
      cta: {
        title: "准备好获取行业解决方案了吗？",
        desc: "联系我们的专家团队，获取专属AI解决方案",
      },
    },
    // 业务咨询页面
    consulting: {
      title: "业务咨询",
      subtitle: "专业AI咨询服务",
      description: "一站式AI转型服务：培训、咨询、落地全程陪伴",
      badge: "业务咨询",
      services: {
        training: {
          name: "AI技术培训",
          desc: "从入门到精通的全方位AI培训课程",
          courses: ["Prompt工程", "模型选型", "应用开发", "企业实践"],
        },
        tech: {
          name: "技术咨询",
          desc: "专业技术咨询服务，提供端到端技术支持",
          courses: ["架构设计", "模型部署", "性能优化", "安全合规"],
        },
        business: {
          name: "业务咨询",
          desc: "专业AI业务咨询服务，助力企业AI转型",
          courses: ["场景规划", "ROI分析", "流程优化", "组织转型"],
        },
      },
      process: {
        title: "咨询流程",
        step1: { title: "需求沟通", desc: "深入了解业务需求与目标" },
        step2: { title: "方案制定", desc: "制定详细的AI转型方案" },
        step3: { title: "实施交付", desc: "专业团队全程跟进实施" },
        step4: { title: "跟踪支持", desc: "持续跟踪效果，优化改进" },
      },
      contact: {
        title: "联系我们",
        phone: "电话",
        email: "邮箱",
        address: "地址",
        workHours: "工作时间",
      },
      cta: {
        title: "准备好获取咨询服务了吗？",
        desc: "联系我们的咨询团队，开启AI转型之旅",
      },
    },
  },
  en: {
    // AI员工页面
    aiEmployee: {
      title: "AI Employees",
      subtitle: "Smart AI Employees for Digital Transformation",
      description: "LLM-based intelligent employees capable of customer service, content creation, programming, and more",
      badge: "AI Employees",
      employees: {
        customerService: {
          name: "AI Customer Service",
          desc: "24/7 intelligent customer service that understands user questions and provides instant, accurate responses",
          capabilities: ["Multi-turn Dialogue", "Emotion Recognition", "Ticket Creation", "Knowledge Base"],
          scenarios: ["E-commerce Service", "After-sales Support", "Consultation Hotline"],
        },
        contentWriter: {
          name: "AI Content Creator",
          desc: "Multi-scenario content creation assistant that generates high-quality copy, reports, and emails",
          capabilities: ["Copywriting", "SEO Optimization", "Translation", "Style Customization"],
          scenarios: ["Marketing", "Content Operations", "Brand Communication"],
        },
        codeAssistant: {
          name: "AI Coding Assistant",
          desc: "Multi-language programming assistant for code completion, bug fixing, refactoring, and documentation",
          capabilities: ["Code Completion", "Bug Detection", "Code Refactoring", "Doc Generation"],
          scenarios: ["Software Development", "Code Review", "Technical Documentation"],
        },
        dataAnalyst: {
          name: "AI Data Analyst",
          desc: "Intelligent data analysis assistant for quick data processing, report generation, and business insights",
          capabilities: ["Data Cleaning", "Trend Analysis", "Report Generation", "Anomaly Detection"],
          scenarios: ["Business Analysis", "Market Research", "Operations Monitoring"],
        },
      },
      labels: {
        capabilities: "Key Capabilities",
        scenarios: "Use Cases",
      },
      features: {
        fastDeploy: { title: "Fast Deployment", desc: "Deploy in minutes without complex configuration" },
        enterpriseSecurity: { title: "Enterprise Security", desc: "Data encryption, access control, compliance assurance" },
        service24_7: { title: "24/7 Service", desc: "Always online, never offline" },
        continuousLearning: { title: "Continuous Learning", desc: "Auto-optimization, gets smarter with use" },
      },
      steps: {
        title: "Three Steps to Hire AI Employees",
        step1: { title: "Select Role", desc: "Choose the right AI employee type based on business needs" },
        step2: { title: "Configure Knowledge", desc: "Upload enterprise knowledge and customize response style" },
        step3: { title: "Start Working", desc: "One-click deployment, AI employees start working immediately" },
      },
      cta: {
        title: "Ready to Hire AI Employees?",
        desc: "Start your free trial now and experience the efficiency boost from AI",
      },
    },
    // 解决方案页面
    solutions: {
      title: "Industry Solutions",
      subtitle: "Custom AI Solutions by Industry",
      description: "Deep expertise in finance, manufacturing, healthcare, education, providing end-to-end AI implementation services",
      badge: "Solutions",
      industries: {
        finance: {
          name: "Financial Services",
          desc: "Full-scenario AI solutions for risk control, customer service, and compliance",
          features: ["Smart Risk Control", "Smart Customer Service", "Compliance Review", "Investment Research"],
        },
        manufacturing: {
          name: "Smart Manufacturing",
          desc: "Industrial AI applications for quality inspection, predictive maintenance, and supply chain optimization",
          features: ["Quality Inspection", "Predictive Maintenance", "Supply Chain Optimization", "Production Scheduling"],
        },
        healthcare: {
          name: "Healthcare",
          desc: "AI solutions for medical diagnosis, record analysis, and drug research",
          features: ["AI Diagnosis", "Record Analysis", "Drug Research", "Health Management"],
        },
        education: {
          name: "Smart Education",
          desc: "AI applications for personalized learning, auto-grading, and course recommendations",
          features: ["Personalized Learning", "Auto Grading", "Course Recommendation", "Learning Analytics"],
        },
        retail: {
          name: "Retail & E-commerce",
          desc: "AI solutions for product recommendations, inventory management, and pricing optimization",
          features: ["Product Recommendations", "Inventory Management", "Price Optimization", "Customer Analysis"],
        },
        travel: {
          name: "Travel & Hospitality",
          desc: "AI applications for itinerary planning, dynamic pricing, and customer experience optimization",
          features: ["Itinerary Planning", "Dynamic Pricing", "Customer Experience", "Operations Optimization"],
        },
      },
      process: {
        title: "Implementation Process",
        step1: { title: "Needs Assessment", desc: "Deep understanding of business scenarios and pain points" },
        step2: { title: "Solution Design", desc: "Tailored AI solutions designed for your needs" },
        step3: { title: "POC Validation", desc: "Small-scale pilot to validate effectiveness" },
        step4: { title: "Deployment", desc: "Full deployment with smooth launch" },
        step5: { title: "Continuous Optimization", desc: "Long-term tracking and continuous improvement" },
      },
      advantages: {
        title: "Technical Advantages",
        customDev: { title: "Custom Development", desc: "Tailored to your needs, not simple templates" },
        enterpriseArch: { title: "Enterprise Architecture", desc: "High availability, high concurrency, scalable design" },
        dataSecurity: { title: "Data Security", desc: "Private deployment, data stays on-premise, compliance assured" },
        continuousSupport: { title: "Continuous Support", desc: "24/7 technical support with quick response" },
      },
      cta: {
        title: "Ready to Get Industry Solutions?",
        desc: "Contact our expert team for your custom AI solution",
      },
    },
    // 业务咨询页面
    consulting: {
      title: "Business Consulting",
      subtitle: "Professional AI Consulting Services",
      description: "One-stop AI transformation services: training, consulting, and implementation support",
      badge: "Consulting",
      services: {
        training: {
          name: "AI Technical Training",
          desc: "Comprehensive AI training courses from beginner to advanced",
          courses: ["Prompt Engineering", "Model Selection", "App Development", "Enterprise Practice"],
        },
        tech: {
          name: "Technical Consulting",
          desc: "Professional technical consulting services with end-to-end support",
          courses: ["Architecture Design", "Model Deployment", "Performance Optimization", "Security Compliance"],
        },
        business: {
          name: "Business Consulting",
          desc: "Professional AI business consulting to drive enterprise transformation",
          courses: ["Scenario Planning", "ROI Analysis", "Process Optimization", "Organizational Transformation"],
        },
      },
      process: {
        title: "Consulting Process",
        step1: { title: "Needs Communication", desc: "Deep understanding of business requirements and goals" },
        step2: { title: "Solution Formulation", desc: "Detailed AI transformation plan" },
        step3: { title: "Implementation Delivery", desc: "Professional team follows through on implementation" },
        step4: { title: "Follow-up Support", desc: "Continuous tracking and optimization" },
      },
      contact: {
        title: "Contact Us",
        phone: "Phone",
        email: "Email",
        address: "Address",
        workHours: "Work Hours",
      },
      cta: {
        title: "Ready to Get Consulting Services?",
        desc: "Contact our consulting team to start your AI transformation journey",
      },
    },
  },
} as const;

export type ProductsTranslation = typeof productsTranslations.zh;
