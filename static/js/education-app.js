/**
 * 研伴 - Vue.js 3 应用
 * Education Digital Human Application
 */

const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

// ==================== 应用创建 ====================
createApp({
  setup() {
    // ==================== 基础状态 ====================
    const activeTab = ref('skills');
    const activePanel = ref(null);  // 新布局：当前激活的面板
    const chatExpanded = ref(false);  // 新布局：对话栏是否展开
    const currentSkill = ref(null);
    const quickText = ref('');
    const chatInput = ref('');
    const messages = ref([]);
    const isTyping = ref(false);
    const chatMessages = ref(null);
    const sessionId = ref('session_' + Date.now());
    const achievementNotification = ref(null);  // 成就通知

    // ==================== 标签页配置 ====================
    const tabs = [
      { id: 'skills', name: '教育技能', icon: 'fa-solid fa-wand-magic-sparkles' },
      { id: 'growth', name: '成长系统', icon: 'fa-solid fa-chart-line' },
      { id: 'records', name: '协作记录', icon: 'fa-solid fa-history' },
      { id: 'chat', name: '对话', icon: 'fa-solid fa-comments' }
    ];

    // ==================== 技能配置 ====================
    const skills = ref([
      { id: 'research-assistant', name: '科研助手', icon: 'fa-solid fa-flask', description: '苏格拉底式引导实验设计，培养科研思维' },
      { id: 'literature-review', name: '文献综述', icon: 'fa-solid fa-book-open', description: 'PRISMA系统综述方法，多数据库协同检索' },
      { id: 'paper-writing', name: '论文写作', icon: 'fa-solid fa-pen-fancy', description: '学术论文写作指导，支持多种引用格式' },
      { id: 'academic-tutoring', name: '虚拟导师', icon: 'fa-solid fa-graduation-cap', description: '个性化学习支持，答疑解惑' }
    ]);

    const skillUsage = ref({});

    const skillDetails = {
      'research-assistant': {
        name: '科研助手',
        icon: 'fa-solid fa-flask',
        description: '苏格拉底式引导实验设计，培养科研思维',
        gradient: 'linear-gradient(135deg, #10b981, #059669)',
        features: ['文献检索与综述', '实验设计引导', '研究假设构建', '数据分析方法指导', '批判性思维培养', '学术诚信提醒']
      },
      'literature-review': {
        name: '文献综述',
        icon: 'fa-solid fa-book-open',
        description: 'PRISMA系统综述方法，多数据库协同检索',
        gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
        features: ['PICO 框架设计', '检索策略制定', 'PRISMA 流程图', '文献质量评估', '纳入/排除标准', '偏倚风险识别']
      },
      'paper-writing': {
        name: '论文写作',
        icon: 'fa-solid fa-pen-fancy',
        description: '学术论文写作指导，支持多种引用格式',
        gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
        features: ['论文结构规划', '学术语言润色', 'APA/MLA/GB/T 7714', '论证逻辑梳理', '学术规范检查', '摘要和关键词优化']
      },
      'academic-tutoring': {
        name: '虚拟导师',
        icon: 'fa-solid fa-graduation-cap',
        description: '个性化学习支持，答疑解惑',
        gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        features: ['个性化知识讲解', '学习路径规划', '难点答疑解惑', '学习进度追踪', '因材施教策略', '启发式提问引导']
      }
    };

    // ==================== 成长系统 ====================
    const growth = ref({
      level: 1,
      exp: 0,
      totalExp: 0,
      stats: {
        conversations: 0,
        papersRead: 0,
        experimentsDesigned: 0,
        papersWritten: 0
      }
    });

    const achievements = ref([
      { id: 'first_chat', name: '初次对话', description: '完成第一次对话', icon: 'fa-solid fa-comments', unlocked: false },
      { id: 'paper_reader', name: '文献读者', description: '阅读10篇文献', icon: 'fa-solid fa-book', unlocked: false },
      { id: 'experiment_designer', name: '实验设计师', description: '设计5个实验', icon: 'fa-solid fa-flask', unlocked: false },
      { id: 'paper_writer', name: '论文写作者', description: '完成论文写作', icon: 'fa-solid fa-pen', unlocked: false },
      { id: 'level_5', name: '进阶学者', description: '达到5级', icon: 'fa-solid fa-star', unlocked: false },
      { id: 'level_10', name: '资深学者', description: '达到10级', icon: 'fa-solid fa-crown', unlocked: false },
      { id: 'collaboration_master', name: '协作大师', description: '完成20次协作', icon: 'fa-solid fa-handshake', unlocked: false },
      { id: 'knowledge_seeker', name: '知识探索者', description: '使用所有技能', icon: 'fa-solid fa-compass', unlocked: false }
    ]);

    const statCards = [
      { key: 'conversations', label: '对话次数', icon: 'fa-solid fa-comments' },
      { key: 'papersRead', label: '阅读文献', icon: 'fa-solid fa-book' },
      { key: 'experimentsDesigned', label: '设计实验', icon: 'fa-solid fa-flask' },
      { key: 'papersWritten', label: '撰写论文', icon: 'fa-solid fa-pen' }
    ];

    // ==================== 协作记录 ====================
    const collaborationRecords = ref([]);
    const collabStats = ref({});
    const selectedRecord = ref(null);
    const collabFilter = ref('all');

    const collabFilters = [
      { key: 'all', label: '全部' },
      { key: 'paper', label: '论文写作' },
      { key: 'experiment', label: '实验设计' },
      { key: 'review', label: '文献综述' },
      { key: 'tutoring', label: '学习辅导' }
    ];

    // ==================== 魔珐星云数字人 ====================
    const xingyunSession = ref({
      sdk: null,
      status: 'disconnected',
      isConnected: false,
      voiceState: 'idle'
    });

    const xingyunConfig = ref({
      appId: '',
      appSecret: '',
      gatewayServer: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session'
    });

    // ==================== 设置弹窗 ====================
    const showSettingsModal = ref(false);
    const apiSettings = ref({
      api_key: '',
      api_key_configured: false,
      base_url: '',
      model: '',
      raw_model: '',
      selectedProvider: null,
      providerInfo: null,
      temperature: 0.7,
      max_tokens: 2048,
      modelProviders: []
    });

    const modelOptions = ref({
      enableThinking: false
    });

    const fastModelSettings = ref({
      enabled: false,
      triggerMode: 'conditional',
      selectedProvider: null,
      conditionMaxLen: 100,
      conditionNoNewline: true,
      conditionNoFiles: true
    });

    const formulaOcrSettings = ref({
      enabled: true,
      api_key: '',
      model: 'standard'
    });

    // ==================== 文件上传 ====================
    const uploadedFiles = ref([]);
    const fileInput = ref(null);

    // ==================== 手写公式 ====================
    const showHandwriteDialog = ref(false);
    const handwriteCanvas = ref(null);
    const handwriteResult = ref('');
    const handwriteLatexPreview = ref('');
    const handwriteRecognizing = ref(false);
    const handwriteDrawing = ref(false);
    const handwritePaths = ref([]);
    const handwriteCurrentPath = ref([]);
    const handwriteDpr = ref(1);
    const penWidth = ref(3);
    const penColor = ref('#333333');
    const penColors = ['#333333', '#1a73e8', '#e53935', '#2e7d32'];
    const hwCanvasContainer = ref(null);

    // ==================== PDF预览 ====================
    const showPdfPreviewDialog = ref(false);
    const pdfPreviewFile = ref(null);
    const pdfPreviewPages = ref([]);
    const pdfPreviewLoading = ref(false);
    const selectedPdfPages = ref([]);
    const pdfTotalPages = ref(0);
    const pdfPreviewScale = ref(0.5);

    // ==================== 对话历史 ====================
    const showHistoryModal = ref(false);
    const chatHistoryList = ref([]);
    const loadingHistory = ref(false);

    // ==================== 导出功能 ====================
    const exportLoading = ref(false);
    const showExportMenu = ref(false);
    const selectedSessionIds = ref([]);
    const includeChatHistory = ref(false);

    // ==================== 学习报告 ====================
    const learningReport = ref(null);
    const reportLoading = ref(false);
    const showReportModal = ref(false);

    // ==================== 语音录制 ====================
    const isRecording = ref(false);
    const mediaRecorder = ref(null);
    const audioChunks = ref([]);
    const voiceWebSocket = ref(null);
    const audioContext = ref(null);

    // 语音打断控制
    let voiceAbortController = null;
    let streamAbortController = null;
    let pendingSpeakTimer = null;

    // ==================== 主题切换 ====================
    const currentTheme = ref(localStorage.getItem('edu-theme') || 'dark');

    // ==================== 自动播报 ====================
    const autoSpeakEnabled = ref(localStorage.getItem('edu-auto-speak') !== 'false');

    // ==================== 知识书签 ====================
    const bookmarks = ref(JSON.parse(localStorage.getItem('edu-bookmarks') || '[]'));

    // ==================== 计算属性 ====================
    const statusText = computed(() => {
      if (xingyunSession.value.status === 'connecting') return '连接中...';
      if (xingyunSession.value.isConnected) return '已连接';
      return '未连接';
    });

    const currentSkillName = computed(() => {
      const skill = skills.value.find(s => s.id === currentSkill.value);
      return skill ? skill.name : '';
    });

    const currentSkillDetail = computed(() => {
      if (!currentSkill.value) return null;
      return skillDetails[currentSkill.value] || null;
    });

    const expForNextLevel = computed(() => {
      return Math.floor(100 * Math.pow(1.5, growth.value.level - 1));
    });

    const expPercentage = computed(() => {
      return Math.min((growth.value.exp / expForNextLevel.value) * 100, 100);
    });

    const unlockedAchievements = computed(() => {
      return achievements.value.filter(a => a.unlocked).length;
    });

    const levelTitle = computed(() => {
      const titles = [
        '学术新手', '学术探索者', '知识学徒', '研究入门者', '进阶学者',
        '学术实践者', '独立研究者', '学术专家', '资深学者', '学术大师',
        '知识领航者', '学术导师', '研究权威', '学术先驱', '知识之光'
      ];
      const idx = Math.min(growth.value.level - 1, titles.length - 1);
      return 'Lv.' + growth.value.level + ' ' + titles[idx];
    });

    const filteredRecords = computed(() => {
      if (collabFilter.value === 'all') return collaborationRecords.value;
      return collaborationRecords.value.filter(r => r.type === collabFilter.value);
    });

    const hasStreamingContent = computed(() => {
      const lastMsg = messages.value[messages.value.length - 1];
      return lastMsg && lastMsg.role === 'assistant' && lastMsg.content && lastMsg.content.length > 0;
    });

    const quickQuestions = computed(() => {
      const questions = {
        'research-assistant': ['如何设计一个对照实验？', '帮我构建研究假设', '推荐合适的统计方法', '如何控制实验变量？'],
        'literature-review': ['帮我制定检索策略', '什么是PRISMA流程？', '如何评估文献质量？', '帮我设计PICO框架'],
        'paper-writing': ['如何写好论文摘要？', '论文Introduction怎么写？', 'APA引用格式怎么用？', '如何梳理论证逻辑？'],
        'academic-tutoring': ['解释一下什么是机器学习', '帮我制定学习计划', '推荐学习资源', '如何提高学术写作能力？']
      };
      return questions[currentSkill.value] || ['你好，请介绍一下你的功能'];
    });

    // ==================== 快捷模板 ====================
    const promptTemplates = computed(() => {
      const templates = {
        'research-assistant': [
          { title: '实验设计方案', description: '完整的对照实验设计流程', prompt: '我想设计一个关于[研究主题]的对照实验。请帮我：1) 明确研究假设 2) 确定自变量和因变量 3) 设计实验组和对照组 4) 列出需要控制的额外变量 5) 建议样本量和统计方法' },
          { title: '文献综述提纲', description: '系统性文献综述框架', prompt: '请帮我为[研究主题]制定一个系统的文献综述计划，包括：1) PICO框架设计 2) 检索关键词和布尔逻辑 3) 数据库选择 4) 纳入排除标准 5) 质量评估方法' },
          { title: '假设检验指导', description: '构建和验证研究假设', prompt: '我正在研究[研究主题]，请帮我：1) 根据现有理论构建3个可测试的研究假设 2) 为每个假设设计验证方案 3) 推荐适合的统计分析方法 4) 指出可能的混淆变量' },
          { title: '科研伦理审查', description: '实验伦理合规检查', prompt: '请帮我检查以下实验设计的科研伦理合规性：[描述你的实验]。包括：1) 知情同意要求 2) 数据隐私保护 3) 潜在风险评估 4) 弱势群体保护 5) 伦理审查申请建议' }
        ],
        'literature-review': [
          { title: 'PRISMA流程', description: 'PRISMA文献筛选全流程', prompt: '请详细指导我完成PRISMA 2020流程的文献筛选，研究主题是[主题]。包括：1) 制定检索策略 2) 初筛和复筛标准 3) 数据提取表格设计 4) 偏倚风险评估工具 5) PRISMA流程图绘制' },
          { title: '系统检索策略', description: '多数据库协同检索方案', prompt: '请帮我设计一个针对[研究主题]的多数据库检索策略，覆盖PubMed、Web of Science、Scopus等数据库，包括MeSH词表、自由词检索和引文追踪策略' },
          { title: '文献质量评估', description: 'RCT和观察性研究质量评价', prompt: '请教我如何使用Cochrane RoB 2工具和NOS量表评估文献质量。需要评估的文献类型包括[描述文献类型]，请给出具体评估步骤和注意事项' },
          { title: 'PICO框架构建', description: '结构化临床问题设计', prompt: '请帮我构建[研究主题]的PICO框架：P(人群/问题)、I(干预)、C(对照)、O(结局)，并基于此框架生成系统检索式' }
        ],
        'paper-writing': [
          { title: '论文摘要撰写', description: '结构化摘要写作指导', prompt: '请指导我撰写一篇关于[研究主题]的结构化摘要，包括背景、方法、结果、结论四个部分。要求语言精炼，符合学术规范，300字以内' },
          { title: 'Introduction框架', description: '引言部分的倒三角写法', prompt: '请帮我构建论文Introduction的写作框架，采用倒三角结构：1) 研究背景与重要性 2) 现有研究综述 3) 研究空白与不足 4) 本研究目的与创新点。研究主题是[主题]' },
          { title: '引用格式规范', description: 'APA/MLA/GB格式对比', prompt: '请详细解释APA第7版、MLA第9版和GB/T 7714-2015三种引用格式在期刊论文、专著、会议论文、网络资源、学位论文场景中的具体用法，给出文中引用和文末参考文献示例' },
          { title: '论证逻辑梳理', description: '论文论证链条优化', prompt: '请帮我梳理论文的论证逻辑。核心论点是[论点]，主要证据包括[证据]。请帮我：1) 检查论证链条完整性 2) 识别逻辑漏洞 3) 建议补充证据 4) 优化论证顺序' }
        ],
        'academic-tutoring': [
          { title: '概念解析', description: '复杂概念的通俗解释', prompt: '请用通俗易懂的方式解释[概念名称]。要求：1) 给出核心定义 2) 用生活中的类比说明 3) 列举3个应用实例 4) 指出常见理解误区 5) 推荐深入学习资源' },
          { title: '学习计划定制', description: '个性化学习路径规划', prompt: '我想系统学习[学科/领域]，背景是[当前水平]。请帮我制定8周学习计划：1) 每周学习目标 2) 推荐学习资源 3) 练习和实践建议 4) 检验学习效果的方法' },
          { title: '知识盲区检测', description: '通过提问发现薄弱环节', prompt: '请通过苏格拉底式提问帮我检测[学科/主题]的知识盲区。从基础概念开始逐步深入，根据我的回答调整难度，发现理解的薄弱环节并针对性补强' },
          { title: '学术写作提升', description: '中英文学术写作技巧', prompt: '请帮我提升学术写作能力。目前的写作难点是[描述问题]。请从以下方面指导：1) 学术语言特点 2) 常见表达方式对比 3) 段落组织原则 4) 过渡词使用 5) 修改润色策略' }
        ]
      };
      return templates[currentSkill.value] || [];
    });

    // ==================== 学习图表 ====================
    const skillChart = ref(null);
    const activityChart = ref(null);

    const initCharts = () => {
      nextTick(() => {
        if (skillChart.value) { skillChart.value.destroy(); skillChart.value = null; }
        if (activityChart.value) { activityChart.value.destroy(); activityChart.value = null; }

        const skillCanvas = document.getElementById('skill-usage-chart');
        const activityCanvas = document.getElementById('activity-chart');
        if (!skillCanvas || !activityCanvas) return;
        if (typeof Chart === 'undefined') return;

        const cs = getComputedStyle(document.documentElement);
        const textSec = cs.getPropertyValue('--text-secondary').trim() || 'rgba(255,255,255,0.7)';
        const textTer = cs.getPropertyValue('--text-tertiary').trim() || 'rgba(255,255,255,0.45)';
        const gridColor = currentTheme.value === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

        const skillNames = skills.value.map(s => s.name);
        const skillValues = skills.value.map(s => skillUsage.value[s.id] || 0);
        const skillColors = ['#10b981', '#0ea5e9', '#f97316', '#8b5cf6'];

        skillChart.value = new Chart(skillCanvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: skillNames,
            datasets: [{
              data: skillValues.every(v => v === 0) ? [1, 1, 1, 1] : skillValues,
              backgroundColor: skillColors.map(c => c + '33'),
              borderColor: skillColors,
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { color: textSec, font: { size: 11, family: 'Outfit' }, padding: 12 } }
            },
            cutout: '60%'
          }
        });

        const stats = growth.value.stats;
        activityChart.value = new Chart(activityCanvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels: ['对话', '文献', '实验', '论文'],
            datasets: [{
              label: '学习活动',
              data: [stats.conversations || 0, stats.papersRead || 0, stats.experimentsDesigned || 0, stats.papersWritten || 0],
              backgroundColor: ['#10b98133', '#0ea5e933', '#f9731633', '#8b5cf633'],
              borderColor: ['#10b981', '#0ea5e9', '#f97316', '#8b5cf6'],
              borderWidth: 2,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true, ticks: { color: textTer, font: { size: 10 } }, grid: { color: gridColor } },
              x: { ticks: { color: textTer, font: { size: 10 } }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
          }
        });
      });
    };

    // ==================== 魔珐星云方法 ====================
    const loadXingYunConfig = async () => {
      try {
        const response = await fetch('/api/xingyun_digital_human/config');
        const data = await response.json();
        xingyunConfig.value = {
          appId: data.appId,
          appSecret: data.appSecret,
          gatewayServer: data.gatewayServer
        };
        console.log('魔珐星云配置加载成功:', data.appId);
      } catch (error) {
        console.error('加载魔珐星云配置失败:', error);
      }
    };

    const createXingYunSession = async () => {
      xingyunSession.value.status = 'connecting';
      try {
        const XmovAvatarClass = window.XmovAvatar || self.XmovAvatar || XmovAvatar;
        if (typeof XmovAvatarClass === 'undefined') {
          throw new Error('魔珐星云 SDK 未加载，请刷新页面重试');
        }

        if (!xingyunConfig.value.appId) {
          await loadXingYunConfig();
        }

        await nextTick();

        const container = document.querySelector('#xingyun-sdk-container');
        if (!container) {
          throw new Error('数字人容器不存在');
        }

        console.log('开始创建魔珐星云 SDK 实例...');

        xingyunSession.value.sdk = new XmovAvatarClass({
          containerId: '#xingyun-sdk-container',
          appId: xingyunConfig.value.appId,
          appSecret: xingyunConfig.value.appSecret,
          gatewayServer: xingyunConfig.value.gatewayServer,
          hardwareAcceleration: "prefer-hardware",
          onMessage(message) {
            console.log('魔珐SDK消息:', message);
            if (message.code && message.code !== 0) {
              console.error('SDK错误:', message);
            }
          },
          onStateChange(state) {
            console.log('魔珐SDK状态变化:', state);
            if (state === 'speak' || state === 'idle' || state === 'listen') {
              xingyunSession.value.isConnected = true;
              xingyunSession.value.status = 'connected';
            }
            if (state === 'speak') {
              xingyunSession.value.voiceState = 'speaking';
            } else if (state === 'listen') {
              xingyunSession.value.voiceState = 'listening';
            } else if (state === 'idle') {
              xingyunSession.value.voiceState = 'idle';
            }
          },
          onStatusChange(status) {
            console.log('魔珐SDK状态码:', status);
            if (status === 0) {
              xingyunSession.value.isConnected = true;
              xingyunSession.value.status = 'connected';
              console.log('魔珐星云已在线');
            }
          },
          onVoiceStateChange(status) {
            console.log('语音状态:', status);
            if (status === 'start') {
              xingyunSession.value.voiceState = 'speaking';
            } else if (status === 'end') {
              xingyunSession.value.voiceState = 'idle';
              if (xingyunSession.value.sdk) {
                xingyunSession.value.sdk.interactiveidle();
              }
            }
          },
          enableLogger: true
        });

        xingyunSession.value.sdk.init({
          initModel: 'normal',
          onDownloadProgress: (progress) => {
            console.log('资源加载进度:', progress);
            if (progress >= 100) {
              xingyunSession.value.isConnected = true;
              xingyunSession.value.status = 'connected';
              console.log('魔珐星云数字人加载完成');
              fixAvatarLayout();
            }
          }
        });

        // 延迟校正：SDK 渲染完成后可能异步调整内部元素
        setTimeout(() => fixAvatarLayout(), 2000);
        setTimeout(() => fixAvatarLayout(), 5000);

        setTimeout(() => {
          if (xingyunSession.value.status === 'connecting') {
            console.log('超时检测：尝试强制标记为已连接');
            xingyunSession.value.isConnected = true;
            xingyunSession.value.status = 'connected';
            fixAvatarLayout();
          }
        }, 30000);

      } catch (error) {
        xingyunSession.value.status = 'error';
        console.error('魔珐星云连接失败:', error);
        alert('连接失败: ' + (error.message || '未知错误'));
      }
    };

    const closeXingYunSession = async () => {
      if (xingyunSession.value.sdk) {
        try {
          xingyunSession.value.sdk.destroy();
        } catch (e) {
          console.error('销毁SDK失败:', e);
        }
      }
      xingyunSession.value = { sdk: null, status: 'disconnected', isConnected: false, voiceState: 'idle' };
    };

    const sendQuickText = async () => {
      if (!quickText.value.trim()) return;
      if (xingyunSession.value.isConnected && xingyunSession.value.sdk) {
        xingyunSession.value.sdk.speak(quickText.value, true, true);
      }
      quickText.value = '';
    };

    // ==================== 数字人布局校正 ====================
    const fixAvatarLayout = () => {
      const container = document.querySelector('#xingyun-sdk-container');
      if (!container) return;

      // 找到 SDK 渲染的实际媒体元素
      const mediaElements = container.querySelectorAll('canvas, video');
      mediaElements.forEach(el => {
        // 只读取 SDK 设置的原始尺寸，不覆盖 style.width/height
        const natW = el.getAttribute('width') || el.width || el.naturalWidth || el.videoWidth;
        const natH = el.getAttribute('height') || el.height || el.naturalHeight || el.videoHeight;
        if (!natW || !natH) return;

        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        const containerRatio = containerW / containerH;
        const elRatio = natW / natH;

        // contain 计算：等比缩放，完全可见
        let scale;
        if (elRatio > containerRatio) {
          scale = containerW / natW;
        } else {
          scale = containerH / natH;
        }

        const targetW = natW * scale;
        const targetH = natH * scale;

        el.style.cssText = [
          'position: absolute',
          `width: ${targetW}px`,
          `height: ${targetH}px`,
          `left: 50%`,
          `top: 50%`,
          `transform: translate(-50%, -50%)`,
          'max-width: none',
          'max-height: none',
        ].join('; ');
      });
    };

    // 窗口 resize 时重新校正
    let resizeTimer = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fixAvatarLayout();
      }, 200);
    };

    // ==================== 主题方法 ====================
    const toggleTheme = () => {
      currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark';
      localStorage.setItem('edu-theme', currentTheme.value);
      applyTheme();
    };

    const applyTheme = () => {
      document.documentElement.setAttribute('data-theme', currentTheme.value);
    };

    // ==================== 自动播报方法 ====================
    const toggleAutoSpeak = () => {
      autoSpeakEnabled.value = !autoSpeakEnabled.value;
      localStorage.setItem('edu-auto-speak', autoSpeakEnabled.value.toString());
    };

    // ==================== 书签方法 ====================
    const toggleBookmark = (msg) => {
      if (msg.role !== 'assistant') return;
      const existingIdx = bookmarks.value.findIndex(
        b => b.content === msg.content.substring(0, 100) && b.timestamp === msg.timestamp
      );
      if (existingIdx > -1) {
        bookmarks.value.splice(existingIdx, 1);
      } else {
        bookmarks.value.push({
          id: Date.now(),
          skill: currentSkill.value || 'unknown',
          skillName: currentSkillName.value || '通用',
          content: msg.content.substring(0, 200),
          fullContent: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }
      localStorage.setItem('edu-bookmarks', JSON.stringify(bookmarks.value));
    };

    const deleteBookmark = (bookmarkId) => {
      bookmarks.value = bookmarks.value.filter(b => b.id !== bookmarkId);
      localStorage.setItem('edu-bookmarks', JSON.stringify(bookmarks.value));
    };

    const isBookmarked = (msg) => {
      if (msg.role !== 'assistant') return false;
      return bookmarks.value.some(
        b => b.content === msg.content.substring(0, 100) && b.timestamp === msg.timestamp
      );
    };

    const insertBookmarkToChat = (bookmark) => {
      chatInput.value = `请详细解释以下内容：\n${bookmark.content}`;
      chatExpanded.value = true;
    };

    // ==================== 技能方法 ====================
    const selectSkill = (skillId) => {
      currentSkill.value = skillId;
    };

    const togglePanel = (panelId) => {
      if (activePanel.value === panelId) {
        activePanel.value = null;
      } else {
        activePanel.value = panelId;
      }
    };

    const startConversation = () => {
      chatExpanded.value = true;  // 新布局：展开对话栏
      activePanel.value = null;   // 收起功能面板
      messages.value = [];
      sessionId.value = 'session_' + Date.now();

      const greetings = {
        'research-assistant': `你好！我是**研友**的科研助手模式。\n\n我可以帮助你：\n- 设计实验方案\n- 构建研究假设\n- 选择合适的研究方法\n- 分析实验数据\n\n请告诉我你正在研究的课题，我们一起探讨！`,
        'literature-review': `你好！我是**研友**的文献综述模式。\n\n我可以帮助你：\n- 制定 PICO 检索框架\n- 设计检索策略和布尔逻辑\n- 使用 PRISMA 流程进行文献筛选\n- 评估文献质量和偏倚风险\n\n请告诉我你的研究主题或感兴趣的领域！`,
        'paper-writing': `你好！我是**研友**的论文写作模式。\n\n我可以帮助你：\n- 规划论文结构和章节\n- 润色学术语言表达\n- 处理引用格式 (APA/MLA/GB/T 7714)\n- 梳理论证逻辑\n\n请告诉我你正在撰写什么类型的论文？`,
        'academic-tutoring': `你好！我是**研友**的虚拟导师模式。\n\n我可以帮助你：\n- 解释复杂概念和知识点\n- 制定个性化学习计划\n- 解答学习中的疑问\n- 推荐学习资源和路径\n\n请告诉我你想学习什么内容？`
      };

      const greeting = greetings[currentSkill.value] || `你好！我是**研友**。\n\n请告诉我你想了解什么，我会尽力帮助你。`;

      messages.value.push({
        role: 'assistant',
        content: greeting,
        timestamp: new Date().toISOString()
      });
      renderKatex();
    };

    // ==================== 对话方法 ====================
    const sendMessage = async () => {
      if (!chatInput.value.trim() || isTyping.value) return;

      const userMessage = chatInput.value.trim();

      let filePaths = [];
      if (uploadedFiles.value.length > 0) {
        for (const file of uploadedFiles.value) {
          if (file.file) {
            const formData = new FormData();
            formData.append('files', file.file, file.name);

            try {
              const uploadResponse = await fetch('/load_file', {
                method: 'POST',
                body: formData
              });
              const uploadData = await uploadResponse.json();

              if (uploadData.success && uploadData.fileLinks && uploadData.fileLinks[0]) {
                filePaths.push(uploadData.fileLinks[0].path);
              }
            } catch (err) {
              console.error('上传文件失败:', err);
            }
          }
        }
      }

      messages.value.push({ role: 'user', content: userMessage, timestamp: new Date().toISOString() });
      chatInput.value = '';

      uploadedFiles.value.forEach(f => {
        if (f.path && f.path.startsWith('blob:')) {
          URL.revokeObjectURL(f.path);
        }
      });
      uploadedFiles.value = [];

      isTyping.value = true;

      await nextTick();
      scrollToBottom();

      try {
        const history = messages.value.slice(-20).map(m => ({
          role: m.role,
          content: m.content
        }));

        const requestBody = {
          message: userMessage,
          skill_id: currentSkill.value,
          session_id: sessionId.value,
          history: history
        };

        if (filePaths.length > 0) {
          requestBody.files = filePaths;
        }

        const response = await fetch('/api/education/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error('请求失败');
        }

        const assistantIndex = messages.value.length;
        messages.value.push({
          role: 'assistant',
          content: '',
          reasoning: '',
          showReasoning: true,
          timestamp: new Date().toISOString(),
          isTyping: true
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let expGained = 10;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.error) {
                  messages.value[assistantIndex].content = `抱歉，出现问题：${data.error}`;
                  messages.value[assistantIndex].isTyping = false;
                  break;
                }

                if (data.reasoning_content) {
                  messages.value[assistantIndex].reasoning += data.reasoning_content;
                }

                if (data.content) {
                  fullContent += data.content;
                  messages.value[assistantIndex].content = fullContent;
                  scrollToBottom();
                }

                if (data.done) {
                  expGained = data.exp_gained || 10;
                }
              } catch (e) {}
            }
          }
        }

        messages.value[assistantIndex].content = fullContent || '（无回复）';
        messages.value[assistantIndex].isTyping = false;
        renderKatex();

        // 自动播报：去 Markdown 符号，限 200 字
        if (autoSpeakEnabled.value && xingyunSession.value.isConnected && xingyunSession.value.sdk && fullContent) {
          const speakText = fullContent.replace(/[#*_`~>\[\]()!|\\]/g, '').replace(/\n+/g, '。').substring(0, 200);
          if (speakText.trim()) {
            xingyunSession.value.sdk.interactiveidle();
            setTimeout(() => {
              xingyunSession.value.sdk.speak(speakText, true, true);
            }, 200);
          }
        }

        if (expGained) {
          growth.value.exp += expGained;
          growth.value.totalExp += expGained;

          while (growth.value.exp >= expForNextLevel.value) {
            growth.value.exp -= expForNextLevel.value;
            growth.value.level++;
          }

          growth.value.stats.conversations = (growth.value.stats.conversations || 0) + 1;
          await checkAchievements();
        }

        await fetch('/api/education/chat/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId.value,
            message: { role: 'user', content: userMessage }
          })
        });

        await fetch('/api/education/chat/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId.value,
            message: { role: 'assistant', content: fullContent }
          })
        });

      } catch (error) {
        messages.value.push({
          role: 'assistant',
          content: `抱歉，连接出现问题：${error.message}\n\n请确保已在主界面配置 API Key。`,
          timestamp: new Date().toISOString()
        });
      }

      isTyping.value = false;
      await nextTick();
      scrollToBottom();
      renderKatex();
    };

    const scrollToBottom = () => {
      if (chatMessages.value) {
        chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
      }
    };

    // ==================== 格式化方法 ====================
    const formatMessage = (content) => {
      if (!content) return '';
      try {
        // 第一步：提取 LaTeX 公式，用占位符保护，防止 marked 破坏
        const mathBlocks = [];
        let processed = content;

        // 先提取 $$...$$（块级）和 \[...\]
        processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
          const idx = mathBlocks.length;
          mathBlocks.push({ formula, display: true });
          return `MATHBLOCK${idx}XEND`;
        });
        processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
          const idx = mathBlocks.length;
          mathBlocks.push({ formula, display: true });
          return `MATHBLOCK${idx}XEND`;
        });

        // 再提取 $...$（行内）和 \(...\)
        processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
          const idx = mathBlocks.length;
          mathBlocks.push({ formula, display: false });
          return `MATHINLINE${idx}XEND`;
        });
        processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
          const idx = mathBlocks.length;
          mathBlocks.push({ formula, display: false });
          return `MATHINLINE${idx}XEND`;
        });

        // 第二步：marked 处理 Markdown
        let html = marked.parse(processed);

        // 第三步：用 KaTeX 渲染公式并替换占位符
        for (let i = 0; i < mathBlocks.length; i++) {
          const { formula, display } = mathBlocks[i];
          const placeholder = display ? `MATHBLOCK${i}XEND` : `MATHINLINE${i}XEND`;
          try {
            if (typeof katex !== 'undefined') {
              const rendered = katex.renderToString(formula.trim(), {
                displayMode: display,
                throwOnError: false,
                trust: true
              });
              // 占位符可能被 marked 包裹在 <p> 标签中，需要处理
              html = html.replace(new RegExp(`<p>\\s*${placeholder}\\s*</p>`, 'g'), rendered);
              html = html.replace(placeholder, rendered);
            } else {
              const fallback = `<code class="latex-fallback">${escapeHtml(formula.trim())}</code>`;
              html = html.replace(new RegExp(`<p>\\s*${placeholder}\\s*</p>`, 'g'), fallback);
              html = html.replace(placeholder, fallback);
            }
          } catch (e) {
            const fallback = `<code class="latex-fallback">${escapeHtml(formula.trim())}</code>`;
            html = html.replace(new RegExp(`<p>\\s*${placeholder}\\s*</p>`, 'g'), fallback);
            html = html.replace(placeholder, fallback);
          }
        }

        return html;
      } catch {
        return content.replace(/\n/g, '<br>');
      }
    };

    const escapeHtml = (str) => {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    // 滚动到底部时重新检查渲染（流式输出期间用）
    const renderKatex = () => {
      // formatMessage 已经内联渲染了，这里仅负责滚动
      nextTick(() => {
        scrollToBottom();
      });
    };

    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN');
    };

    const getTypeIcon = (type) => {
      const icons = {
        paper: 'fa-solid fa-pen',
        experiment: 'fa-solid fa-flask',
        review: 'fa-solid fa-book',
        tutoring: 'fa-solid fa-graduation-cap'
      };
      return icons[type] || 'fa-solid fa-file';
    };

    const getTypeName = (type) => {
      const names = {
        paper: '论文写作',
        experiment: '实验设计',
        review: '文献综述',
        tutoring: '学习辅导'
      };
      return names[type] || '协作';
    };

    // ==================== 协作记录方法 ====================
    const showRecordDetail = (record) => {
      selectedRecord.value = record;
    };

    const getMergedContributions = (record) => {
      const items = [];
      (record.humanContributions || []).forEach(c => {
        items.push({ ...c, source: 'human' });
      });
      (record.aiContributions || []).forEach(c => {
        items.push({ ...c, source: 'ai' });
      });
      items.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
      return items;
    };

    const refreshCollaboration = async () => {
      try {
        const [collabRes, statsRes] = await Promise.all([
          fetch('/api/education/collaboration'),
          fetch('/api/education/collaboration/stats')
        ]);
        if (collabRes.ok) {
          const collabData = await collabRes.json();
          const allRecords = [
            ...(collabData.papers || []).map(r => ({ ...r, type: 'paper' })),
            ...(collabData.experiments || []).map(r => ({ ...r, type: 'experiment' })),
            ...(collabData.reviews || []).map(r => ({ ...r, type: 'review' })),
            ...(collabData.sessions || []).map(r => ({ ...r, type: 'tutoring' }))
          ].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
          collaborationRecords.value = allRecords;
        }
        if (statsRes.ok) {
          collabStats.value = await statsRes.json();
        }
      } catch (e) {
        console.error('刷新协作记录失败:', e);
      }
    };

    // ==================== 导出方法 ====================
    const toggleSessionSelection = (id) => {
      const index = selectedSessionIds.value.indexOf(id);
      if (index > -1) {
        selectedSessionIds.value.splice(index, 1);
      } else {
        selectedSessionIds.value.push(id);
      }
    };

    const exportSelectedCollaborations = async () => {
      exportLoading.value = true;
      try {
        const requestBody = {
          format: 'word',
          include_chat_history: includeChatHistory.value
        };

        if (selectedSessionIds.value.length > 0) {
          requestBody.session_ids = selectedSessionIds.value;
        }

        const response = await fetch('/api/education/collaboration/export_all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || '导出失败');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `协作记录_${new Date().toISOString().slice(0,10)}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        selectedSessionIds.value = [];
      } catch (e) {
        console.error('导出协作记录失败:', e);
        alert('导出失败: ' + e.message);
      } finally {
        exportLoading.value = false;
      }
    };

    const exportCollaboration = async (record, format = 'docx') => {
      if (!record || !record.id) {
        alert('请选择要导出的协作记录');
        return;
      }
      exportLoading.value = true;
      try {
        const response = await fetch('/api/education/collaboration/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: record.id,
            format: 'word'
          })
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || '导出失败');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `协作记录_${record.title || record.type}_${new Date().toISOString().slice(0,10)}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (e) {
        console.error('导出协作记录失败:', e);
        alert('导出失败: ' + e.message);
      } finally {
        exportLoading.value = false;
      }
    };

    // ==================== 学习报告方法 ====================
    const openReportModal = async () => {
      showReportModal.value = true;
      reportLoading.value = true;
      try {
        const response = await fetch('/api/education/report/generate');
        if (!response.ok) throw new Error('生成报告失败');
        learningReport.value = await response.json();
      } catch (e) {
        console.error('生成学习报告失败:', e);
        alert('生成报告失败: ' + e.message);
      } finally {
        reportLoading.value = false;
      }
    };

    const exportLearningReport = async (format = 'docx') => {
      reportLoading.value = true;
      try {
        const response = await fetch('/api/education/report/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: 'word' })
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || '导出报告失败');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `学习报告_${new Date().toISOString().slice(0,10)}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (e) {
        console.error('导出学习报告失败:', e);
        alert('导出失败: ' + e.message);
      } finally {
        reportLoading.value = false;
      }
    };

    // ==================== 对话历史方法 ====================
    const loadChatHistoryList = async () => {
      loadingHistory.value = true;
      try {
        const response = await fetch('/api/education/chat/history');
        const data = await response.json();
        chatHistoryList.value = (data.sessions || []).sort((a, b) =>
          (b.last_message_time || '').localeCompare(a.last_message_time || '')
        );
      } catch (error) {
        console.error('加载历史失败:', error);
      } finally {
        loadingHistory.value = false;
      }
    };

    const loadHistorySession = async (targetSessionId) => {
      try {
        const response = await fetch(`/api/education/chat/history?session_id=${targetSessionId}`);
        const data = await response.json();
        if (data.history) {
          messages.value = data.history;
          sessionId.value = targetSessionId;
          showHistoryModal.value = false;
          chatExpanded.value = true;  // 新布局：展开对话栏
          activePanel.value = null;   // 收起功能面板
          await nextTick();
          scrollToBottom();
          renderKatex();
        }
      } catch (error) {
        console.error('加载会话失败:', error);
        alert('加载会话失败');
      }
    };

    const deleteHistorySession = async (targetSessionId) => {
      if (!confirm('确定要删除这个会话吗？')) return;

      try {
        await fetch(`/api/education/chat/history/${targetSessionId}`, {
          method: 'DELETE'
        });
        chatHistoryList.value = chatHistoryList.value.filter(s => s.session_id !== targetSessionId);

        if (sessionId.value === targetSessionId) {
          messages.value = [];
          sessionId.value = 'session_' + Date.now();
        }
      } catch (error) {
        console.error('删除会话失败:', error);
        alert('删除会话失败');
      }
    };

    const clearCurrentChat = () => {
      if (messages.value.length === 0) return;
      if (!confirm('确定要清空当前对话吗？')) return;

      messages.value = [];
      sessionId.value = 'session_' + Date.now();
    };

    const clearAllHistory = async () => {
      if (!confirm('确定要清空所有历史对话吗？此操作不可恢复！')) return;

      try {
        for (const session of chatHistoryList.value) {
          await fetch(`/api/education/chat/history/${session.session_id}`, {
            method: 'DELETE'
          });
        }
        chatHistoryList.value = [];
        messages.value = [];
        sessionId.value = 'session_' + Date.now();
        showHistoryModal.value = false;
      } catch (error) {
        console.error('清空历史失败:', error);
        alert('清空历史失败');
      }
    };

    // ==================== 设置方法 ====================
    const loadApiSettings = async () => {
      try {
        const response = await fetch('/api/education/settings');
        if (response.ok) {
          const data = await response.json();
          apiSettings.value = {
            api_key: '',
            api_key_configured: data.api_key_configured || false,
            base_url: data.base_url || '',
            model: data.model || '',
            raw_model: data.raw_model || '',
            selectedProvider: data.selectedProvider || null,
            providerInfo: data.providerInfo || null,
            temperature: data.temperature ?? 0.7,
            max_tokens: data.max_tokens ?? 2048,
            modelProviders: data.modelProviders || []
          };
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    };

    const saveAllSettings = async () => {
      try {
        const currentSettingsResponse = await fetch('/api/education/settings');
        let currentSettings = {};
        if (currentSettingsResponse.ok) {
          currentSettings = await currentSettingsResponse.json();
        }

        const settingsToSave = {
          ...currentSettings,
          fast: fastModelSettings.value,
          modelOptions: modelOptions.value,
          formulaOcr: formulaOcrSettings.value
        };

        const response = await fetch('/api/education/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsToSave)
        });

        if (response.ok) {
          alert('设置已保存！');
          showSettingsModal.value = false;
        } else {
          const error = await response.json();
          alert('保存失败: ' + (error.detail || '未知错误'));
        }
      } catch (error) {
        console.error('保存设置失败:', error);
        alert('保存设置失败');
      }
    };

    // ==================== 文件上传方法 ====================
    const handleFileUpload = async (event) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      for (const file of files) {
        const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
        const fileObj = {
          name: file.name,
          type: fileType,
          file: file,
          path: URL.createObjectURL(file)
        };
        uploadedFiles.value.push(fileObj);
      }
      event.target.value = '';
    };

    const removeUploadedFile = (index) => {
      const file = uploadedFiles.value[index];
      if (file.path && file.path.startsWith('blob:')) {
        URL.revokeObjectURL(file.path);
      }
      uploadedFiles.value.splice(index, 1);
    };

    const getFileIcon = (type) => {
      const icons = {
        pdf: 'fa-solid fa-file-pdf',
        image: 'fa-solid fa-file-image'
      };
      return icons[type] || 'fa-solid fa-file';
    };

    // ==================== 手写公式方法 ====================
    const initHandwriteCanvas = () => {
      nextTick(() => {
        if (!handwriteCanvas.value) return;
        const canvas = handwriteCanvas.value;
        const container = hwCanvasContainer.value || canvas.parentElement;
        if (!container) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        handwriteDpr.value = dpr;

        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);

        ctx.strokeStyle = penColor.value;
        ctx.lineWidth = penWidth.value;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 重绘已有内容
        redrawCanvas();
      });
    };

    const updatePenStyle = () => {
      if (!handwriteCanvas.value) return;
      const ctx = handwriteCanvas.value.getContext('2d');
      ctx.strokeStyle = penColor.value;
      ctx.lineWidth = penWidth.value;
    };

    const copyLatex = () => {
      if (handwriteResult.value) {
        navigator.clipboard.writeText(handwriteResult.value).then(() => {
          const btn = document.querySelector('.hw-copy-btn');
          if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 1500);
          }
        });
      }
    };

    const getEventPos = (e) => {
      const canvas = handwriteCanvas.value;
      const rect = canvas.getBoundingClientRect();
      if (e.touches) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const startDrawing = (e) => {
      e.preventDefault();
      handwriteDrawing.value = true;
      const pos = getEventPos(e);
      handwriteCurrentPath.value = [pos];
    };

    const draw = (e) => {
      if (!handwriteDrawing.value) return;
      e.preventDefault();
      const pos = getEventPos(e);
      handwriteCurrentPath.value.push(pos);

      const canvas = handwriteCanvas.value;
      const ctx = canvas.getContext('2d');

      if (handwriteCurrentPath.value.length >= 2) {
        const lastPos = handwriteCurrentPath.value[handwriteCurrentPath.value.length - 2];
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    };

    const stopDrawing = (e) => {
      if (handwriteDrawing.value && handwriteCurrentPath.value.length > 0) {
        handwritePaths.value.push({
          points: [...handwriteCurrentPath.value],
          color: penColor.value,
          width: penWidth.value
        });
      }
      handwriteDrawing.value = false;
      handwriteCurrentPath.value = [];
    };

    const clearHandwriteCanvas = () => {
      const canvas = handwriteCanvas.value;
      const ctx = canvas.getContext('2d');
      const dpr = handwriteDpr.value;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      handwritePaths.value = [];
      handwriteResult.value = '';
      handwriteLatexPreview.value = '';
    };

    const undoHandwrite = () => {
      if (handwritePaths.value.length === 0) return;
      handwritePaths.value.pop();
      redrawCanvas();
    };

    const redrawCanvas = () => {
      const canvas = handwriteCanvas.value;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = handwriteDpr.value;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const path of handwritePaths.value) {
        // 兼容旧格式（纯数组）和新格式（对象）
        const points = Array.isArray(path) ? path : path.points;
        const color = Array.isArray(path) ? '#333' : path.color;
        const width = Array.isArray(path) ? 3 : path.width;
        if (!points || points.length < 2) continue;
        ctx.strokeStyle = color || penColor.value;
        ctx.lineWidth = width || penWidth.value;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      }
    };

    const recognizeHandwrite = async () => {
      if (!formulaOcrSettings.value.enabled) {
        alert('请先在设置中启用公式识别功能');
        return;
      }
      if (!formulaOcrSettings.value.api_key) {
        alert('请先在设置中配置 SimpleTex 用户授权令牌');
        return;
      }

      const canvas = handwriteCanvas.value;
      const imageData = canvas.toDataURL('image/png');

      handwriteRecognizing.value = true;
      try {
        const response = await fetch('/api/formula_ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageData,
            model: formulaOcrSettings.value.model,
            api_key: formulaOcrSettings.value.api_key
          })
        });
        const data = await response.json();

        if (data.success && data.latex) {
          handwriteResult.value = data.latex;
          if (window.MathJax) {
            handwriteLatexPreview.value = `\\[${data.latex}\\]`;
            nextTick(() => {
              MathJax.typesetPromise && MathJax.typesetPromise();
            });
          } else {
            handwriteLatexPreview.value = `<code>${data.latex}</code>`;
          }
        } else {
          alert(data.error || '识别失败，请重试');
        }
      } catch (error) {
        console.error('识别错误:', error);
        alert('识别失败，请检查网络连接');
      } finally {
        handwriteRecognizing.value = false;
      }
    };

    const insertHandwriteResult = () => {
      if (handwriteResult.value) {
        chatInput.value += (chatInput.value ? '\n' : '') + '$$' + handwriteResult.value + '$$';
        showHandwriteDialog.value = false;
        clearHandwriteCanvas();
      }
    };

    // ==================== PDF预览方法 ====================
    const openPdfPreview = async (file) => {
      pdfPreviewFile.value = file;
      pdfPreviewLoading.value = true;
      pdfPreviewPages.value = [];
      selectedPdfPages.value = [];
      showPdfPreviewDialog.value = true;

      try {
        let filePath = file.path || file.url;

        if (filePath && filePath.startsWith('blob:')) {
          const uploadedPath = await uploadPdfForPreview(file);
          if (!uploadedPath) {
            alert('上传PDF文件失败');
            showPdfPreviewDialog.value = false;
            pdfPreviewLoading.value = false;
            return;
          }
          filePath = uploadedPath;
          pdfPreviewFile.value.serverPath = uploadedPath;
        }

        const response = await fetch('/api/pdf_info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: filePath })
        });
        const data = await response.json();

        if (data.success) {
          pdfTotalPages.value = data.page_count || 0;
          await loadPdfPageImages();
        } else {
          alert(data.error || '获取PDF信息失败');
        }
      } catch (err) {
        console.error('PDF preview error:', err);
        alert('打开PDF预览失败');
      } finally {
        pdfPreviewLoading.value = false;
      }
    };

    const uploadPdfForPreview = async (file) => {
      try {
        const formData = new FormData();
        if (file.file instanceof Blob) {
          formData.append('files', file.file, file.name);
        } else {
          const response = await fetch(file.path);
          const blob = await response.blob();
          formData.append('files', blob, file.name);
        }

        const uploadResponse = await fetch('/load_file', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadResponse.json();

        if (uploadData.success && uploadData.fileLinks && uploadData.fileLinks[0]) {
          return uploadData.fileLinks[0].path;
        }
        return null;
      } catch (err) {
        console.error('Upload PDF error:', err);
        return null;
      }
    };

    const loadPdfPageImages = async () => {
      if (!pdfPreviewFile.value) return;

      try {
        const filePath = pdfPreviewFile.value.serverPath || pdfPreviewFile.value.path || pdfPreviewFile.value.url;

        const response = await fetch('/api/pdf_pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_path: filePath,
            scale: pdfPreviewScale.value
          })
        });
        const data = await response.json();

        if (data.success) {
          pdfPreviewPages.value = data.pages.map((img, idx) => ({
            pageNum: idx + 1,
            image: img,
            selected: false
          }));
        }
      } catch (err) {
        console.error('Load PDF pages error:', err);
      }
    };

    const togglePdfPageSelection = (pageNum) => {
      const idx = selectedPdfPages.value.indexOf(pageNum);
      if (idx > -1) {
        selectedPdfPages.value.splice(idx, 1);
      } else {
        selectedPdfPages.value.push(pageNum);
      }
      const page = pdfPreviewPages.value.find(p => p.pageNum === pageNum);
      if (page) page.selected = !page.selected;
    };

    const selectAllPdfPages = () => {
      selectedPdfPages.value = pdfPreviewPages.value.map(p => p.pageNum);
      pdfPreviewPages.value.forEach(p => p.selected = true);
    };

    const clearPdfPageSelection = () => {
      selectedPdfPages.value = [];
      pdfPreviewPages.value.forEach(p => p.selected = false);
    };

    const extractSelectedPdfPages = async () => {
      if (selectedPdfPages.value.length === 0) {
        alert('请先选择要提取的页面');
        return;
      }

      pdfPreviewLoading.value = true;
      try {
        const pageRange = selectedPdfPages.value.sort((a, b) => a - b).join(',');
        const filePath = pdfPreviewFile.value.serverPath || pdfPreviewFile.value.path || pdfPreviewFile.value.url;

        const response = await fetch('/api/pdf_extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_path: filePath,
            page_range: pageRange,
            return_page_images: false
          })
        });
        const data = await response.json();

        if (data.success) {
          const text = data.text || '';
          if (text) {
            chatInput.value += `\n[PDF内容 - 第${pageRange}页]\n${text}\n`;
            alert(`已提取 ${selectedPdfPages.value.length} 页内容`);
          }
          showPdfPreviewDialog.value = false;
        } else {
          alert(data.error || '提取PDF内容失败');
        }
      } catch (err) {
        console.error('Extract PDF error:', err);
        alert('提取PDF内容失败');
      } finally {
        pdfPreviewLoading.value = false;
      }
    };

    // ==================== 语音方法 ====================
    const toggleVoiceRecording = async () => {
      if (isRecording.value) {
        stopRecording();
      } else {
        await startRecording();
      }
    };

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000
          }
        });

        const options = { mimeType: 'audio/webm' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'audio/mp4';
        }

        mediaRecorder.value = new MediaRecorder(stream, options);
        audioChunks.value = [];

        mediaRecorder.value.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.value.push(event.data);
          }
        };

        mediaRecorder.value.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' });
          await sendVoiceMessage(audioBlob);
        };

        mediaRecorder.value.start();
        isRecording.value = true;

      } catch (error) {
        console.error('无法访问麦克风:', error);
        alert('无法访问麦克风，请确保已授予权限。');
      }
    };

    const stopRecording = () => {
      if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
        mediaRecorder.value.stop();
      }
      isRecording.value = false;
    };

    const sendVoiceMessage = async (audioBlob) => {
      isTyping.value = true;

      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Audio = e.target.result.split(',')[1];

          try {
            const history = messages.value.slice(-20).map(m => ({
              role: m.role,
              content: m.content
            }));

            const requestBody = {
              audio_data: base64Audio,
              skill_id: currentSkill.value,
              session_id: sessionId.value,
              language: 'zh',
              digital_human_type: 'xingyun',
              frontend_drive: true,
              history: history
            };

            const response = await fetch('/api/education/voice/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (response.ok) {
              if (data.text) {
                messages.value.push({
                  role: 'user',
                  content: `🎤 ${data.text}`,
                  timestamp: new Date().toISOString()
                });
              }

              messages.value.push({
                role: 'assistant',
                content: data.response,
                timestamp: new Date().toISOString()
              });

              if (xingyunSession.value.isConnected && xingyunSession.value.sdk && data.response) {
                xingyunSession.value.sdk.interactiveidle();
                setTimeout(() => {
                  xingyunSession.value.sdk.speak(data.response, true, true);
                }, 100);
              }

              if (data.exp_gained) {
                growth.value.exp += data.exp_gained;
                growth.value.totalExp += data.exp_gained;

                while (growth.value.exp >= expForNextLevel.value) {
                  growth.value.exp -= expForNextLevel.value;
                  growth.value.level++;
                }

                growth.value.stats.conversations = (growth.value.stats.conversations || 0) + 1;
                await checkAchievements();
              }

              await nextTick();
              scrollToBottom();
              renderKatex();
            } else {
              let errorMsg = '语音对话失败';
              if (data.detail) {
                if (typeof data.detail === 'string') {
                  errorMsg = data.detail;
                } else if (data.detail.message) {
                  errorMsg = data.detail.message;
                }
              }
              throw new Error(errorMsg);
            }
          } catch (error) {
            console.error('语音处理错误:', error);
            messages.value.push({
              role: 'assistant',
              content: `抱歉，语音处理出现问题：${error.message}`,
              timestamp: new Date().toISOString()
            });
          }

          isTyping.value = false;
        };

        reader.readAsDataURL(audioBlob);

      } catch (error) {
        console.error('发送语音消息失败:', error);
        isTyping.value = false;
      }
    };

    // ==================== 成就方法 ====================
    const checkAchievements = async () => {
      const conditions = {
        'first_chat': growth.value.stats.conversations >= 1,
        'paper_reader': growth.value.stats.papersRead >= 10,
        'experiment_designer': growth.value.stats.experimentsDesigned >= 5,
        'paper_writer': growth.value.stats.papersWritten >= 1,
        'level_5': growth.value.level >= 5,
        'level_10': growth.value.level >= 10,
        'collaboration_master': collabStats.value.totalSessions >= 20,
        'knowledge_seeker': Object.keys(skillUsage.value).length >= 4
      };

      for (const [achievementId, condition] of Object.entries(conditions)) {
        if (condition) {
          const achievement = achievements.value.find(a => a.id === achievementId);
          if (achievement && !achievement.unlocked) {
            await unlockAchievement(achievementId);
          }
        }
      }
    };

    const unlockAchievement = async (achievementId) => {
      try {
        const response = await fetch('/api/education/achievements/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ achievement_id: achievementId })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success') {
            const achievement = achievements.value.find(a => a.id === achievementId);
            if (achievement) {
              achievement.unlocked = true;
              achievement.unlockedAt = new Date().toISOString();
            }
            showAchievementNotification(achievements.value.find(a => a.id === achievementId));
          }
        }
      } catch (error) {
        console.error('解锁成就失败:', error);
      }
    };

    const showAchievementNotification = (achievement) => {
      achievementNotification.value = achievement;
      setTimeout(() => {
        achievementNotification.value = null;
      }, 4000);
    };

    // ==================== 数据加载 ====================
    const loadData = async () => {
      try {
        const dashboardRes = await fetch('/api/education/dashboard');
        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          growth.value.level = dashboardData.level || 1;
          growth.value.exp = dashboardData.exp || 0;
          growth.value.totalExp = dashboardData.totalExp || 0;
          growth.value.stats = dashboardData.stats || growth.value.stats;
          skillUsage.value = dashboardData.skillUsage || {};
        }

        const achRes = await fetch('/api/education/achievements');
        if (achRes.ok) {
          const achData = await achRes.json();
          achievements.value = achData.achievements || achievements.value;
        }

        const collabRes = await fetch('/api/education/collaboration');
        if (collabRes.ok) {
          const collabData = await collabRes.json();
          const allRecords = [
            ...(collabData.papers || []).map(r => ({ ...r, type: 'paper' })),
            ...(collabData.experiments || []).map(r => ({ ...r, type: 'experiment' })),
            ...(collabData.reviews || []).map(r => ({ ...r, type: 'review' })),
            ...(collabData.sessions || []).map(r => ({ ...r, type: 'tutoring' }))
          ].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
          collaborationRecords.value = allRecords;
        }

        const statsRes = await fetch('/api/education/collaboration/stats');
        if (statsRes.ok) {
          collabStats.value = await statsRes.json();
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      }
    };

    // ==================== 监听器 ====================
    watch(showHistoryModal, (newVal) => {
      if (newVal) {
        loadChatHistoryList();
      }
    });

    watch(showHandwriteDialog, (newVal) => {
      if (newVal) {
        // 重置状态
        handwritePaths.value = [];
        handwriteResult.value = '';
        handwriteLatexPreview.value = '';
        nextTick(() => {
          initHandwriteCanvas();
        });
      }
    });

    watch(showSettingsModal, (newVal) => {
      if (newVal) {
        loadApiSettings();
      }
    });

    watch(activePanel, (newVal) => {
      if (newVal === 'growth') {
        setTimeout(() => initCharts(), 300);
      }
    });

    // ==================== 生命周期 ====================
    onMounted(async () => {
      applyTheme();
      await loadData();
      setTimeout(() => {
        document.getElementById('loadingOverlay').classList.add('hidden');
      }, 500);

      document.addEventListener('click', (e) => {
        if (showExportMenu.value && !e.target.closest('.export-dropdown')) {
          showExportMenu.value = false;
        }
      });

      // 监听窗口缩放，校正数字人位置
      window.addEventListener('resize', handleResize);
      // 监听浏览器缩放 (Ctrl+/-)
      window.addEventListener('orientationchange', handleResize);
      // 使用 visualViewport 监听移动端缩放
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
      }
    });

    // ==================== 返回 ====================
    return {
      // 基础状态
      activeTab,
      activePanel,
      chatExpanded,
      currentSkill,
      quickText,
      chatInput,
      messages,
      isTyping,
      chatMessages,
      sessionId,
      achievementNotification,

      // 主题
      currentTheme,
      toggleTheme,

      // 自动播报
      autoSpeakEnabled,
      toggleAutoSpeak,

      // 书签
      bookmarks,
      toggleBookmark,
      deleteBookmark,
      isBookmarked,
      insertBookmarkToChat,

      // 标签页
      tabs,

      // 技能
      skills,
      skillUsage,
      currentSkillName,
      currentSkillDetail,
      selectSkill,
      togglePanel,
      startConversation,
      quickQuestions,
      promptTemplates,

      // 成长系统
      growth,
      achievements,
      statCards,
      levelTitle,
      expForNextLevel,
      expPercentage,
      unlockedAchievements,

      // 协作记录
      collaborationRecords,
      collabStats,
      selectedRecord,
      collabFilter,
      collabFilters,
      filteredRecords,
      showRecordDetail,
      getMergedContributions,
      refreshCollaboration,
      getTypeIcon,
      getTypeName,
      formatDate,

      // 数字人
      xingyunSession,
      statusText,
      createXingYunSession,
      closeXingYunSession,
      sendQuickText,

      // 设置
      showSettingsModal,
      apiSettings,
      modelOptions,
      fastModelSettings,
      formulaOcrSettings,
      saveAllSettings,

      // 文件上传
      uploadedFiles,
      fileInput,
      handleFileUpload,
      removeUploadedFile,
      getFileIcon,

      // 手写公式
      showHandwriteDialog,
      handwriteCanvas,
      handwriteResult,
      handwriteLatexPreview,
      handwriteRecognizing,
      handwritePaths,
      startDrawing,
      draw,
      stopDrawing,
      clearHandwriteCanvas,
      undoHandwrite,
      recognizeHandwrite,
      insertHandwriteResult,
      penWidth,
      penColor,
      penColors,
      updatePenStyle,
      copyLatex,
      hwCanvasContainer,

      // PDF预览
      showPdfPreviewDialog,
      pdfPreviewPages,
      pdfPreviewLoading,
      selectedPdfPages,
      openPdfPreview,
      togglePdfPageSelection,
      selectAllPdfPages,
      clearPdfPageSelection,
      extractSelectedPdfPages,

      // 对话历史
      showHistoryModal,
      chatHistoryList,
      loadingHistory,
      loadChatHistoryList,
      loadHistorySession,
      deleteHistorySession,
      clearCurrentChat,
      clearAllHistory,

      // 导出
      exportLoading,
      showExportMenu,
      selectedSessionIds,
      includeChatHistory,
      toggleSessionSelection,
      exportSelectedCollaborations,
      exportCollaboration,

      // 学习报告
      learningReport,
      reportLoading,
      showReportModal,
      openReportModal,
      exportLearningReport,

      // 对话
      sendMessage,
      formatMessage,
      formatTime,
      hasStreamingContent,
      renderKatex,

      // 语音
      isRecording,
      toggleVoiceRecording
    };
  }
}).mount('#app');
