/**
 * 研伴 - Vue.js 3 应用
 * Education Digital Human Application
 */

const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

// ==================== 应用创建 ====================
createApp({
  setup() {
    // ==================== 工具函数 ====================
    const downloadBlob = async (response, filename) => {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    };

    // ==================== 基础状态 ====================
    const activeTab = ref('skills');
    const activePanel = ref(null);
    const chatExpanded = ref(false);
    const chatMode = ref(localStorage.getItem('edu-chat-mode') || 'bottom');  // 'bottom' | 'sidebar'
    const chatHeight = ref(parseInt(localStorage.getItem('edu-chat-height')) || 450);  // 底部模式高度
    const isResizing = ref(false);  // 拖拽调整中
    let dragStartY = 0;  // 拖拽起始Y坐标
    let dragStartHeight = 0;  // 拖拽起始高度
    const currentSkill = ref(null);
    const quickText = ref('');
    const chatInput = ref('');
    const messages = ref([]);
    const isTyping = ref(false);
    const chatMessages = ref(null);
    const sessionId = ref('session_' + Date.now());
    const achievementNotification = ref(null);  // 成就通知
    const isUserScrolling = ref(false);  // 用户是否正在手动滚动
    const isNearBottom = ref(true);  // 是否接近底部（用于判断是否自动滚动）

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
      { id: 'academic-tutoring', name: '虚拟导师', icon: 'fa-solid fa-graduation-cap', description: '个性化学习支持，答疑解惑' },
      { id: 'math-assistant', name: '数学助手', icon: 'fa-solid fa-square-root-variable', description: '手写公式识别，数学推导与解题' }
    ]);

    const skillUsage = ref({});

    const skillDetails = {
      'research-assistant': {
        name: '科研助手',
        icon: 'fa-solid fa-flask',
        description: '苏格拉底式引导实验设计，培养科研思维',
        gradient: 'linear-gradient(135deg, oklch(0.72 0.15 160), oklch(0.62 0.14 160))',
        features: ['文献检索与综述', '实验设计引导', '研究假设构建', '数据分析方法指导', '批判性思维培养', '学术诚信提醒']
      },
      'literature-review': {
        name: '文献综述',
        icon: 'fa-solid fa-book-open',
        description: 'PRISMA系统综述方法，多数据库协同检索',
        gradient: 'linear-gradient(135deg, oklch(0.72 0.13 230), oklch(0.62 0.12 230))',
        features: ['PICO 框架设计', '检索策略制定', 'PRISMA 流程图', '文献质量评估', '纳入/排除标准', '偏倚风险识别']
      },
      'paper-writing': {
        name: '论文写作',
        icon: 'fa-solid fa-pen-fancy',
        description: '学术论文写作指导，支持多种引用格式',
        gradient: 'linear-gradient(135deg, oklch(0.72 0.17 35), oklch(0.62 0.16 35))',
        features: ['论文结构规划', '学术语言润色', 'APA/MLA/GB/T 7714', '论证逻辑梳理', '学术规范检查', '摘要和关键词优化']
      },
      'academic-tutoring': {
        name: '虚拟导师',
        icon: 'fa-solid fa-graduation-cap',
        description: '个性化学习支持，答疑解惑',
        gradient: 'linear-gradient(135deg, oklch(0.72 0.16 290), oklch(0.62 0.18 290))',
        features: ['个性化知识讲解', '学习路径规划', '难点答疑解惑', '学习进度追踪', '因材施教策略', '启发式提问引导']
      },
      'math-assistant': {
        name: '数学助手',
        icon: 'fa-solid fa-square-root-variable',
        description: '手写公式识别，数学推导与解题',
        gradient: 'linear-gradient(135deg, oklch(0.72 0.18 340), oklch(0.62 0.17 340))',
        features: ['手写公式识别与解析', 'LaTeX 公式编辑', '分步解题推导', '数学概念可视化', '多领域数学支持', '错题分析与举一反三']
      }
    };

    // ==================== 技能阶段与工具栏 ====================

    const skillStages = {
      'research-assistant': [
        { id: 'topic', name: '选题探索', icon: 'fa-solid fa-magnifying-glass' },
        { id: 'hypothesis', name: '假设构建', icon: 'fa-solid fa-lightbulb' },
        { id: 'design', name: '实验设计', icon: 'fa-solid fa-flask' },
        { id: 'analysis', name: '数据分析', icon: 'fa-solid fa-chart-column' }
      ],
      'literature-review': [
        { id: 'scope', name: '主题界定', icon: 'fa-solid fa-bullseye' },
        { id: 'search', name: '检索策略', icon: 'fa-solid fa-database' },
        { id: 'screen', name: '筛选评估', icon: 'fa-solid fa-filter' },
        { id: 'synthesis', name: '综合撰写', icon: 'fa-solid fa-file-lines' }
      ],
      'paper-writing': [
        { id: 'topic', name: '论文选题', icon: 'fa-solid fa-magnifying-glass' },
        { id: 'outline', name: '框架搭建', icon: 'fa-solid fa-sitemap' },
        { id: 'writing', name: '内容撰写', icon: 'fa-solid fa-pen-fancy' },
        { id: 'polish', name: '润色定稿', icon: 'fa-solid fa-spell-check' }
      ],
      'academic-tutoring': [
        { id: 'diagnose', name: '学情诊断', icon: 'fa-solid fa-stethoscope' },
        { id: 'explain', name: '知识讲解', icon: 'fa-solid fa-chalkboard-user' },
        { id: 'practice', name: '练习巩固', icon: 'fa-solid fa-dumbbell' },
        { id: 'review', name: '总结提升', icon: 'fa-solid fa-arrow-up' }
      ],
      'math-assistant': [
        { id: 'understand', name: '问题理解', icon: 'fa-solid fa-question' },
        { id: 'method', name: '方法选择', icon: 'fa-solid fa-route' },
        { id: 'solve', name: '逐步求解', icon: 'fa-solid fa-stairs' },
        { id: 'verify', name: '验证总结', icon: 'fa-solid fa-check-double' }
      ]
    };

    const skillToolbarActions = {
      'research-assistant': [
        { label: '定义变量', icon: 'fa-solid fa-list-check', prompt: '请帮我梳理并定义这个研究中的关键变量，区分自变量、因变量和控制变量，并说明各变量的操作化定义。' },
        { label: '统计方法', icon: 'fa-solid fa-chart-bar', prompt: '请根据我的研究设计和数据类型，推荐合适的统计分析方法，并解释为什么选择这个方法。' },
        { label: '实验检查', icon: 'fa-solid fa-clipboard-check', prompt: '请帮我检查实验设计的严谨性，包括样本量是否充足、控制变量是否完整、可能的混淆因素有哪些。' },
        { label: '伦理审查', icon: 'fa-solid fa-shield-halved', prompt: '请帮我审查研究方案的伦理问题，包括知情同意、隐私保护、数据安全等方面。' }
      ],
      'literature-review': [
        { label: 'PICO 框架', icon: 'fa-solid fa-bullseye', prompt: '请帮我使用 PICO 框架（Population, Intervention, Comparison, Outcome）明确我的文献综述研究问题。' },
        { label: '检索策略', icon: 'fa-solid fa-database', prompt: '请帮我设计系统化的检索策略，包括选择数据库、确定检索词和布尔逻辑组合。' },
        { label: '质量评估', icon: 'fa-solid fa-star-half-stroke', prompt: '请提供一套文献质量评估框架，帮助我评估纳入文献的方法学质量和偏倚风险。' },
        { label: '引用格式', icon: 'fa-solid fa-quote-left', prompt: '请帮我将以下文献信息转换为标准的引用格式（请指定 APA/MLA/GB/T 7714/IEEE）：' }
      ],
      'paper-writing': [
        { label: '生成大纲', icon: 'fa-solid fa-sitemap', prompt: '请根据我的研究主题，帮我生成一个完整的论文大纲，包括各章节的主要内容要点。' },
        { label: '段落润色', icon: 'fa-solid fa-wand-magic-sparkles', prompt: '请帮我润色以下段落的学术表达，使其更加精准、流畅，同时保持原意不变：\n\n' },
        { label: '引用插入', icon: 'fa-solid fa-quote-left', prompt: '请帮我将以下内容正确地引用到论文中，确保符合学术引用规范：\n\n' },
        { label: '查重提示', icon: 'fa-solid fa-copy', prompt: '请帮我检查以下段落是否存在潜在的学术不端风险（如过度引用、自我抄袭等），并给出修改建议：\n\n' }
      ],
      'academic-tutoring': [
        { label: '知识图谱', icon: 'fa-solid fa-diagram-project', prompt: '请帮我构建这个知识点的概念图谱，展示核心概念之间的关系和层次结构。' },
        { label: '练习题', icon: 'fa-solid fa-pencil', prompt: '请根据当前讲解的知识点，设计 3 道由易到难的练习题，帮我巩固理解。' },
        { label: '学习计划', icon: 'fa-solid fa-calendar-days', prompt: '请帮我制定一个学习计划，包括学习目标、时间安排和检验方式。' },
        { label: '错题分析', icon: 'fa-solid fa-bug', prompt: '请帮我分析以下错题的错误原因，指出我理解上的偏差，并给出正确解法：\n\n' }
      ],
      'math-assistant': [
        { label: 'LaTeX 公式', icon: 'fa-solid fa-code', prompt: '请将以下数学表达式转换为标准的 LaTeX 代码：\n\n' },
        { label: '分步解题', icon: 'fa-solid fa-stairs', prompt: '请帮我分步求解以下数学问题，每一步都要标注数学依据：\n\n' },
        { label: '函数绘图', icon: 'fa-solid fa-chart-line', prompt: '请帮我分析以下函数的性质（定义域、值域、极值、单调性等），并描述其图像特征：\n\n' },
        { label: '验算检查', icon: 'fa-solid fa-check-double', prompt: '请帮我验算以下解题过程是否正确，如果有错误请指出具体在哪一步：\n\n' }
      ]
    };

    const currentStage = ref(0);
    const skillContextMap = ref(JSON.parse(localStorage.getItem('edu-skill-context') || '{}'));

    const skillStagesList = computed(() => {
      return currentSkill.value ? (skillStages[currentSkill.value] || []) : [];
    });

    const skillToolbar = computed(() => {
      return currentSkill.value ? (skillToolbarActions[currentSkill.value] || []) : [];
    });

    const savedSkillContext = computed(() => {
      if (!currentSkill.value) return null;
      return skillContextMap.value[currentSkill.value] || null;
    });

    const hasSavedContext = computed(() => {
      return !!savedSkillContext.value && savedSkillContext.value.lastTopic;
    });

    const savedContextPreview = computed(() => {
      return hasSavedContext.value ? savedSkillContext.value.lastTopic : '';
    });

    // 已处理的阶段跳转记录（防止重复触发）
    const processedStageCommands = ref(new Set());

    // 检测AI回复中的阶段标记【阶段名】
    const detectStageFromResponse = (content) => {
      if (!currentSkill.value || !skillStages[currentSkill.value]) return false;
      const stages = skillStages[currentSkill.value];
      for (let i = 0; i < stages.length; i++) {
        const regex = new RegExp('【' + stages[i].name + '】');
        if (regex.test(content)) {
          // 允许任意跳转（向前或向后）
          if (i !== currentStage.value) {
            currentStage.value = i;
            console.log(`[阶段检测] 从【${stages[i]?.name}】标记检测到阶段: ${i}`);
            return true;
          }
          return false;
        }
      }
      return false;
    };

    const saveSkillContext = () => {
      if (!currentSkill.value) return;
      const lastUserMsg = [...messages.value].reverse().find(m => m.role === 'user');
      const lastAiMsg = [...messages.value].reverse().find(m => m.role === 'assistant');
      const topic = lastUserMsg ? lastUserMsg.content.substring(0, 50) : '';
      const ctx = {
        lastTopic: topic,
        stage: currentStage.value,
        stageName: skillStagesList.value[currentStage.value]?.name || '',
        timestamp: new Date().toISOString()
      };
      skillContextMap.value[currentSkill.value] = ctx;
      localStorage.setItem('edu-skill-context', JSON.stringify(skillContextMap.value));
    };

    const continueSkillContext = (skillId) => {
      const ctx = skillContextMap.value[skillId];
      if (!ctx) return;
      currentStage.value = ctx.stage || 0;
      chatInput.value = `让我们继续上次关于「${ctx.lastTopic}」的讨论，请接着上次的内容继续。`;
    };

    // 用户手动设置阶段（点击阶段按钮）- 不触发奖励
    const setUserStage = (stageIndex) => {
      if (!skillStagesList.value.length) return;
      if (stageIndex < 0 || stageIndex >= skillStagesList.value.length) return;

      const prevStage = currentStage.value;
      currentStage.value = stageIndex;
      const stageName = skillStagesList.value[stageIndex]?.name || '';
      console.log(`[阶段切换] 用户手动跳转到: ${stageName}`);

      saveSkillContext();
    };

    // AI触发的阶段跳转 - 向前推进时触发奖励
    const setStage = async (stageIndex, fromAI = false) => {
      if (!skillStagesList.value.length) return;
      if (stageIndex < 0 || stageIndex >= skillStagesList.value.length) return;

      const prevStage = currentStage.value;
      currentStage.value = stageIndex;
      const stageName = skillStagesList.value[stageIndex]?.name || '';
      console.log(`[阶段切换] 跳转到: ${stageName} (fromAI: ${fromAI})`);

      // 只有AI触发的向前推进才记录奖励
      if (fromAI && stageIndex > prevStage) {
        await recordStageComplete(stageName);
      }

      saveSkillContext();
    };

    // AI可调用的阶段跳转指令解析
    const parseStageCommand = (content) => {
      // 匹配 [跳转阶段:检索策略] 或 [阶段:筛选评估] 格式
      const match = content.match(/\[(?:跳转阶段|阶段)[:：]\s*([^\]]+)\]/);
      console.log('[阶段跳转] 解析内容:', content?.substring(0, 100), '匹配结果:', match);
      if (match) {
        const targetName = match[1].trim();
        const stages = skillStagesList.value;
        console.log('[阶段跳转] 目标阶段:', targetName, '当前技能:', currentSkill.value, '阶段列表:', stages?.map(s => s.name));

        if (!stages || stages.length === 0) {
          console.warn('[阶段跳转] 阶段列表为空，无法跳转');
          return false;
        }

        // 先尝试精确匹配
        for (let i = 0; i < stages.length; i++) {
          if (stages[i].name === targetName || stages[i].id === targetName) {
            // 检查是否已处理过（防止重复）
            const commandKey = `${currentSkill.value}-${i}-${Date.now().toString().slice(0, -5)}`;
            if (!processedStageCommands.value.has(commandKey)) {
              processedStageCommands.value.add(commandKey);
              // 清理过期的记录（保留最近10条）
              if (processedStageCommands.value.size > 10) {
                const arr = Array.from(processedStageCommands.value);
                processedStageCommands.value = new Set(arr.slice(-10));
              }
              console.log('[阶段跳转] 精确匹配成功，跳转到:', stages[i].name, '索引:', i);
              setStage(i, true);  // AI触发的跳转
              return true;
            } else {
              console.log('[阶段跳转] 命令已处理过，跳过:', commandKey);
            }
          }
        }

        // 模糊匹配：包含关键词即可
        for (let i = 0; i < stages.length; i++) {
          if (stages[i].name.includes(targetName) || targetName.includes(stages[i].name)) {
            const commandKey = `${currentSkill.value}-${i}-${Date.now().toString().slice(0, -5)}`;
            if (!processedStageCommands.value.has(commandKey)) {
              processedStageCommands.value.add(commandKey);
              console.log('[阶段跳转] 模糊匹配成功，跳转到:', stages[i].name, '索引:', i);
              setStage(i, true);
              return true;
            }
          }
        }
        console.warn('[阶段跳转] 未找到匹配的阶段:', targetName);
      }
      return false;
    };

    // ==================== AI触发笔记生成 ====================
    const processedNoteCommands = ref(new Set());

    // 解析笔记生成命令：[生成笔记] 或 [自动笔记]
    const parseNoteCommand = async (content) => {
      // 匹配 [生成笔记] 或 [自动笔记] 格式
      const match = content.match(/\[(?:生成笔记|自动笔记)\]/);
      if (match) {
        console.log('[笔记生成] 检测到AI触发笔记生成命令');

        // 防止重复触发（5秒内只触发一次）
        const now = Date.now();
        const recentCommands = Array.from(processedNoteCommands.value).filter(t => now - t < 5000);
        if (recentCommands.length > 0) {
          console.log('[笔记生成] 5秒内已触发过，跳过');
          return false;
        }
        processedNoteCommands.value.add(now);

        // 检查是否有足够的对话内容
        if (messages.value.length < 2) {
          console.warn('[笔记生成] 对话内容不足，无法生成笔记');
          return false;
        }

        // 先显示"正在生成"提示
        showAchievementNotification({
          name: '正在生成笔记',
          description: '请稍候...',
          icon: 'fa-solid fa-spinner fa-spin'
        });

        // 调用笔记生成
        console.log('[笔记生成] 开始自动生成笔记...');
        await generateNoteFromChat();
        return true;
      }
      return false;
    };

    // ==================== 番茄钟 ====================
    const showPomodoro = ref(false);
    const POMODORO_CIRCLE_LENGTH = 534;  // SVG圆周长 = 2 * π * 85
    const pomodoroSettings = ref({
      workDuration: 25,
      shortBreak: 5,
      longBreak: 15
    });
    const pomodoroState = ref({
      phase: 'work',
      timeLeft: 25 * 60,
      isRunning: false,
      completedPomodoros: 0,
      todayPomodoros: 0
    });
    const pomodoroTask = ref('');  // 当前番茄任务名
    const pomodoroSettingsExpanded = ref(false);
    const pomodoroMusicEnabled = ref(false);
    const pomodoroVolume = ref(50);
    const pomodoroCurrentTrack = ref(null);
    const showCompletedPanel = ref(false);
    let pomodoroTimer = null;
    let pomodoroAudio = null;

    // 番茄钟面板拖拽
    const pomodoroPanelPos = ref({ x: window.innerWidth - 340, y: 80 });
    let pomodoroDragStart = { x: 0, y: 0, posX: 0, posY: 0 };
    let isDraggingPomodoro = false;

    // 恢复番茄钟面板位置
    const pomodoroPosSaved = localStorage.getItem('edu-pomodoro-pos');
    if (pomodoroPosSaved) {
      try {
        pomodoroPanelPos.value = JSON.parse(pomodoroPosSaved);
      } catch (e) {}
    }

    // 番茄钟拖拽开始
    const startPomodoroDrag = (e) => {
      e.preventDefault();
      isDraggingPomodoro = true;
      pomodoroDragStart = {
        x: e.clientX,
        y: e.clientY,
        posX: pomodoroPanelPos.value.x,
        posY: pomodoroPanelPos.value.y
      };
      document.addEventListener('mousemove', onPomodoroDrag);
      document.addEventListener('mouseup', stopPomodoroDrag);
    };

    // 番茄钟拖拽中
    const onPomodoroDrag = (e) => {
      if (!isDraggingPomodoro) return;
      const dx = e.clientX - pomodoroDragStart.x;
      const dy = e.clientY - pomodoroDragStart.y;
      // 限制在屏幕范围内
      const newX = Math.max(0, Math.min(window.innerWidth - 320, pomodoroDragStart.posX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, pomodoroDragStart.posY + dy));
      pomodoroPanelPos.value = { x: newX, y: newY };
    };

    // 番茄钟拖拽结束
    const stopPomodoroDrag = () => {
      isDraggingPomodoro = false;
      document.removeEventListener('mousemove', onPomodoroDrag);
      document.removeEventListener('mouseup', stopPomodoroDrag);
      // 保存位置
      localStorage.setItem('edu-pomodoro-pos', JSON.stringify(pomodoroPanelPos.value));
    };

    // 音乐曲目列表 - 使用本地mp3文件
    const pomodoroTracks = [
      { id: 'nostalgia', name: 'Nostalgia', icon: 'fa-solid fa-moon', file: '01_Nostalgia.mp3' },
      { id: 'fishstep', name: 'Fish Step', icon: 'fa-solid fa-fish', file: '02_Fish Step.mp3' },
      { id: 'newings', name: 'NEWings', icon: 'fa-solid fa-dove', file: '03_NEWings.mp3' },
      { id: 'chilldream', name: 'ChilDream', icon: 'fa-solid fa-cloud', file: '05_ChilDream.mp3' },
      { id: 'memory', name: 'Memory', icon: 'fa-solid fa-clock-rotate-left', file: '09_Memory.mp3' },
      { id: 'stillair', name: 'Still Air', icon: 'fa-solid fa-wind', file: '10_Still Air.mp3' },
      { id: 'petals', name: 'Petals', icon: 'fa-solid fa-seedling', file: '12_Petals.mp3' },
      { id: 'timeless', name: 'Timeless', icon: 'fa-solid fa-infinity', file: '15_Timeless.mp3' },
      { id: 'aqua', name: 'Aqua Room', icon: 'fa-solid fa-droplet', file: '16_Aqua Room.mp3' },
      { id: 'indigo', name: 'Indigo', icon: 'fa-solid fa-palette', file: '14_Indigo.mp3' }
    ];

    // 番茄钟显示文本
    const pomodoroDisplay = computed(() => {
      const minutes = Math.floor(pomodoroState.value.timeLeft / 60);
      const seconds = pomodoroState.value.timeLeft % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    });

    // 番茄钟阶段文本
    const pomodoroPhaseText = computed(() => {
      const texts = {
        work: '专注时间',
        shortBreak: '短休息',
        longBreak: '长休息'
      };
      return texts[pomodoroState.value.phase] || '';
    });

    // 番茄钟进度百分比
    const pomodoroPercent = computed(() => {
      const phaseDurations = {
        work: pomodoroSettings.value.workDuration * 60,
        shortBreak: pomodoroSettings.value.shortBreak * 60,
        longBreak: pomodoroSettings.value.longBreak * 60
      };
      const totalTime = phaseDurations[pomodoroState.value.phase];
      const elapsed = totalTime - pomodoroState.value.timeLeft;
      return Math.round((elapsed / totalTime) * 100);
    });

    // 番茄钟进度（SVG圆环）
    const pomodoroProgress = computed(() => {
      const phaseDurations = {
        work: pomodoroSettings.value.workDuration * 60,
        shortBreak: pomodoroSettings.value.shortBreak * 60,
        longBreak: pomodoroSettings.value.longBreak * 60
      };
      const totalTime = phaseDurations[pomodoroState.value.phase];
      const progress = pomodoroState.value.timeLeft / totalTime;
      return POMODORO_CIRCLE_LENGTH * (1 - progress);
    });

    // 更新设置
    const updatePomodoroSetting = (key, delta) => {
      const limits = {
        workDuration: { min: 5, max: 60 },
        shortBreak: { min: 1, max: 15 },
        longBreak: { min: 5, max: 30 }
      };
      const newVal = pomodoroSettings.value[key] + delta;
      pomodoroSettings.value[key] = Math.max(limits[key].min, Math.min(limits[key].max, newVal));

      // 如果是当前阶段，更新剩余时间
      if (pomodoroState.value.phase === 'work' && key === 'workDuration' && !pomodoroState.value.isRunning) {
        pomodoroState.value.timeLeft = newVal * 60;
      }
      savePomodoroState();
    };

    // 切换音乐
    const togglePomodoroMusic = () => {
      pomodoroMusicEnabled.value = !pomodoroMusicEnabled.value;
      if (pomodoroMusicEnabled.value && !pomodoroCurrentTrack.value) {
        pomodoroCurrentTrack.value = pomodoroTracks[0];
      }
      if (!pomodoroMusicEnabled.value && pomodoroAudio) {
        pomodoroAudio.pause();
        pomodoroAudio = null;
      } else if (pomodoroMusicEnabled.value && pomodoroCurrentTrack.value) {
        playPomodoroMusic();
      }
    };

    // 选择曲目
    const selectPomodoroTrack = (track) => {
      pomodoroCurrentTrack.value = track;
      if (pomodoroMusicEnabled.value) {
        playPomodoroMusic();
      }
    };

    // 播放音乐
    const playPomodoroMusic = () => {
      if (!pomodoroCurrentTrack.value) return;

      if (pomodoroAudio) {
        pomodoroAudio.pause();
      }

      // 使用本地mp3文件路径
      pomodoroAudio = new Audio(`/mp3/${pomodoroCurrentTrack.value.file}`);
      pomodoroAudio.loop = true;
      pomodoroAudio.volume = pomodoroVolume.value / 100;
      pomodoroAudio.play().catch(e => console.log('音乐播放失败:', e));
    };

    // 监听音量变化
    watch(pomodoroVolume, (newVol) => {
      if (pomodoroAudio) {
        pomodoroAudio.volume = newVol / 100;
      }
    });

    // 开始番茄钟
    const startPomodoro = () => {
      pomodoroState.value.isRunning = true;
      if (pomodoroMusicEnabled.value && pomodoroCurrentTrack.value) {
        playPomodoroMusic();
      }
      pomodoroTimer = setInterval(() => {
        if (pomodoroState.value.timeLeft > 0) {
          pomodoroState.value.timeLeft--;
        } else {
          completePomodoroPhase();
        }
      }, 1000);
    };

    // 暂停番茄钟
    const pausePomodoro = () => {
      pomodoroState.value.isRunning = false;
      if (pomodoroTimer) {
        clearInterval(pomodoroTimer);
        pomodoroTimer = null;
      }
      if (pomodoroAudio) {
        pomodoroAudio.pause();
      }
    };

    // 重置番茄钟
    const resetPomodoro = () => {
      pausePomodoro();
      pomodoroState.value.phase = 'work';
      pomodoroState.value.timeLeft = pomodoroSettings.value.workDuration * 60;
    };

    // 跳过当前阶段
    const skipPomodoro = () => {
      completePomodoroPhase();
    };

    // 完成当前阶段
    const completePomodoroPhase = () => {
      pausePomodoro();

      // 播放提示音
      playNotificationSound();

      if (pomodoroState.value.phase === 'work') {
        pomodoroState.value.completedPomodoros++;
        pomodoroState.value.todayPomodoros++;

        if (pomodoroState.value.completedPomodoros % 4 === 0) {
          pomodoroState.value.phase = 'longBreak';
          pomodoroState.value.timeLeft = pomodoroSettings.value.longBreak * 60;
        } else {
          pomodoroState.value.phase = 'shortBreak';
          pomodoroState.value.timeLeft = pomodoroSettings.value.shortBreak * 60;
        }

        recordPomodoroComplete();
      } else {
        pomodoroState.value.phase = 'work';
        pomodoroState.value.timeLeft = pomodoroSettings.value.workDuration * 60;
      }

      savePomodoroState();
    };

    // 播放提示音
    const playNotificationSound = () => {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQMCZ6/c5JlhAxKC0eW2eQsMU4vT5ahdAxmTx9LkmFkDGpHH0eWYVwMZkcbQ5ZhWAw==');
      audio.play().catch(() => {});
    };

    // 记录番茄完成
    const recordPomodoroComplete = async () => {
      // 更新番茄钟统计
      if (!growth.value.stats.pomodoros) {
        growth.value.stats.pomodoros = 0;
      }
      growth.value.stats.pomodoros++;

      // 增加经验
      await addExp(expRewards.pomodoroComplete, '完成番茄钟');
    };

    // 保存番茄钟状态
    const savePomodoroState = () => {
      localStorage.setItem('edu-pomodoro', JSON.stringify({
        settings: pomodoroSettings.value,
        completedPomodoros: pomodoroState.value.completedPomodoros,
        todayPomodoros: pomodoroState.value.todayPomodoros,
        task: pomodoroTask.value,
        musicEnabled: pomodoroMusicEnabled.value,
        volume: pomodoroVolume.value,
        currentTrackId: pomodoroCurrentTrack.value?.id,
        lastDate: new Date().toDateString()
      }));
    };

    // 加载番茄钟状态
    const loadPomodoroState = () => {
      try {
        const saved = localStorage.getItem('edu-pomodoro');
        if (saved) {
          const data = JSON.parse(saved);
          pomodoroSettings.value = { ...pomodoroSettings.value, ...data.settings };
          pomodoroTask.value = data.task || '';
          pomodoroMusicEnabled.value = data.musicEnabled || false;
          pomodoroVolume.value = data.volume || 50;
          if (data.currentTrackId) {
            pomodoroCurrentTrack.value = pomodoroTracks.find(t => t.id === data.currentTrackId) || null;
          }

          if (data.lastDate === new Date().toDateString()) {
            pomodoroState.value.completedPomodoros = data.completedPomodoros || 0;
            pomodoroState.value.todayPomodoros = data.todayPomodoros || 0;
          } else {
            pomodoroState.value.completedPomodoros = 0;
            pomodoroState.value.todayPomodoros = 0;
          }
        }
      } catch (e) {}

      pomodoroState.value.timeLeft = pomodoroSettings.value.workDuration * 60;
    };

    // ==================== AI触发番茄钟控制 ====================
    const processedPomodoroCommands = ref(new Set());

    // 解析番茄钟命令：[开始番茄:任务名] [设置番茄:25分钟] [暂停番茄] [重置番茄]
    const parsePomodoroCommand = (content) => {
      // 匹配 [开始番茄:任务名] 或 [开始番茄]
      const startMatch = content.match(/\[开始番茄(?::([^\]]+))?\]/);
      if (startMatch) {
        const taskName = startMatch[1]?.trim() || '';
        console.log('[番茄钟] AI触发开始番茄，任务:', taskName || '无');

        // 防止重复触发（3秒内）
        const now = Date.now();
        const recent = Array.from(processedPomodoroCommands.value).filter(t => now - t < 3000);
        if (recent.length > 0) {
          console.log('[番茄钟] 3秒内已触发过，跳过');
          return false;
        }
        processedPomodoroCommands.value.add(now);

        // 设置任务名并显示番茄钟面板
        if (taskName) {
          pomodoroTask.value = taskName;
        }
        showPomodoro.value = true;

        // 如果番茄钟未运行，则启动
        if (!pomodoroState.value.isRunning) {
          // 重置到工作阶段
          pomodoroState.value.phase = 'work';
          pomodoroState.value.timeLeft = pomodoroSettings.value.workDuration * 60;
          startPomodoro();
        }

        // 显示通知
        showAchievementNotification({
          name: '番茄钟已启动',
          description: taskName ? `任务：${taskName}` : '专注时间开始',
          icon: 'fa-solid fa-clock'
        });
        return true;
      }

      // 匹配 [设置番茄:25分钟] 或 [设置番茄:25]
      const settingMatch = content.match(/\[设置番茄[:：](\d+)分钟?\]/);
      if (settingMatch) {
        const minutes = parseInt(settingMatch[1]);
        if (minutes >= 1 && minutes <= 60) {
          console.log('[番茄钟] AI设置番茄时长:', minutes, '分钟');
          pomodoroSettings.value.workDuration = minutes;
          // 如果未运行，更新倒计时
          if (!pomodoroState.value.isRunning && pomodoroState.value.phase === 'work') {
            pomodoroState.value.timeLeft = minutes * 60;
          }
          showAchievementNotification({
            name: '番茄钟设置已更新',
            description: `工作时长：${minutes}分钟`,
            icon: 'fa-solid fa-sliders'
          });
          return true;
        }
      }

      // 匹配 [暂停番茄]
      if (content.includes('[暂停番茄]')) {
        console.log('[番茄钟] AI触发暂停番茄');
        if (pomodoroState.value.isRunning) {
          pausePomodoro();
          showAchievementNotification({
            name: '番茄钟已暂停',
            description: '可以随时继续',
            icon: 'fa-solid fa-pause'
          });
        }
        return true;
      }

      // 匹配 [重置番茄]
      if (content.includes('[重置番茄]')) {
        console.log('[番茄钟] AI触发重置番茄');
        resetPomodoro();
        showAchievementNotification({
          name: '番茄钟已重置',
          description: '准备开始新的专注',
          icon: 'fa-solid fa-rotate-right'
        });
        return true;
      }

      return false;
    };

    // ==================== 待办事项系统 ====================
    const showTodoPanel = ref(false);
    const todoLists = ref([]);
    const activeTodoList = ref(null);
    const newTodoText = ref('');
    const newTodoDueDate = ref('');
    const todoPanelPos = ref({ x: 80, y: window.innerHeight - 524 });  // 面板位置
    let todoDragStart = { x: 0, y: 0, posX: 0, posY: 0 };
    let isDraggingTodo = false;

    // 今日日期字符串
    const todayDate = computed(() => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    });

    // 当前选中的列表
    const currentTodoList = computed(() => {
      return todoLists.value.find(l => l.id === activeTodoList.value) || null;
    });

    // 当前列表的未完成任务
    const currentIncompleteTodos = computed(() => {
      if (!currentTodoList.value) return [];
      return currentTodoList.value.todos.filter(t => !t.completed);
    });

    // 当前列表的已完成任务
    const currentCompletedTodos = computed(() => {
      if (!currentTodoList.value) return [];
      return currentTodoList.value.todos.filter(t => t.completed).sort((a, b) =>
        new Date(b.completedAt) - new Date(a.completedAt)
      );
    });

    // 是否有未完成任务
    const hasIncompleteTodos = computed(() => {
      return currentIncompleteTodos.value.length > 0;
    });

    // 获取列表统计
    const getTodoStats = (listId) => {
      const list = todoLists.value.find(l => l.id === listId);
      if (!list) return { total: 0, completed: 0, incomplete: 0 };
      const completed = list.todos.filter(t => t.completed).length;
      const total = list.todos.length;
      return { total, completed, incomplete: total - completed };
    };

    // 检查是否过期
    const isOverdue = (todo) => {
      if (!todo.dueDate || todo.completed) return false;
      const dueDate = new Date(todo.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    };

    // 格式化日期（短格式）
    const formatDateShort = (dateStr) => {
      if (!dateStr) return '';
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      if (dateStr === todayStr) {
        return '今天';
      } else if (dateStr === tomorrowStr) {
        return '明天';
      } else {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    };

    // 添加新列表
    const addTodoList = () => {
      const newList = {
        id: 'list_' + Date.now(),
        name: '新列表',
        todos: [],
        createdAt: new Date().toISOString()
      };
      todoLists.value.push(newList);
      activeTodoList.value = newList.id;
      saveTodoLists();
    };

    // 删除列表
    const deleteTodoList = (listId) => {
      todoLists.value = todoLists.value.filter(l => l.id !== listId);
      if (activeTodoList.value === listId) {
        activeTodoList.value = todoLists.value[0]?.id || null;
      }
      saveTodoLists();
    };

    // 添加任务
    const addTodo = () => {
      if (!newTodoText.value.trim() || !currentTodoList.value) return;

      const newTodo = {
        id: 'todo_' + Date.now(),
        text: newTodoText.value.trim(),
        dueDate: newTodoDueDate.value || null,
        completed: false,
        createdAt: new Date().toISOString()
      };

      currentTodoList.value.todos.push(newTodo);
      newTodoText.value = '';
      newTodoDueDate.value = '';
      saveTodoLists();
    };

    // 完成任务
    const completeTodo = (todoId) => {
      if (!currentTodoList.value) return;
      const todo = currentTodoList.value.todos.find(t => t.id === todoId);
      if (todo) {
        todo.completed = true;
        todo.completedAt = new Date().toISOString();
        saveTodoLists();

        // 更新待办完成统计
        if (!growth.value.stats.todosCompleted) {
          growth.value.stats.todosCompleted = 0;
        }
        growth.value.stats.todosCompleted++;

        // 增加经验
        addExp(expRewards.todoComplete, '完成待办任务');
      }
    };

    // 恢复任务
    const restoreTodo = (todoId) => {
      if (!currentTodoList.value) return;
      const todo = currentTodoList.value.todos.find(t => t.id === todoId);
      if (todo) {
        todo.completed = false;
        todo.completedAt = null;
        saveTodoLists();
        // 恢复时减少统计（如果之前增加了）
        if (growth.value.stats.todosCompleted > 0) {
          growth.value.stats.todosCompleted--;
        }
      }
    };

    // 删除任务
    const deleteTodo = (todoId) => {
      if (!currentTodoList.value) return;
      currentTodoList.value.todos = currentTodoList.value.todos.filter(t => t.id !== todoId);
      saveTodoLists();
    };

    // 全部完成
    const completeAllTodos = () => {
      if (!currentTodoList.value) return;
      const incompleteCount = currentIncompleteTodos.value.length;
      currentTodoList.value.todos.forEach(todo => {
        if (!todo.completed) {
          todo.completed = true;
          todo.completedAt = new Date().toISOString();
        }
      });
      saveTodoLists();

      // 更新待办完成统计
      if (!growth.value.stats.todosCompleted) {
        growth.value.stats.todosCompleted = 0;
      }
      growth.value.stats.todosCompleted += incompleteCount;

      // 批量增加经验
      addExp(incompleteCount * expRewards.todoComplete, '批量完成待办任务');
    };

    // 清空已完成
    const clearCompletedTodos = () => {
      if (!currentTodoList.value) return;
      currentTodoList.value.todos = currentTodoList.value.todos.filter(t => !t.completed);
      saveTodoLists();
    };

    // 保存待办列表
    const saveTodoLists = () => {
      localStorage.setItem('edu-todo-lists', JSON.stringify(todoLists.value));
    };

    // 加载待办列表
    const loadTodoLists = () => {
      try {
        const saved = localStorage.getItem('edu-todo-lists');
        if (saved) {
          todoLists.value = JSON.parse(saved);
          if (todoLists.value.length > 0 && !activeTodoList.value) {
            activeTodoList.value = todoLists.value[0].id;
          }
        }
        // 加载面板位置
        const posSaved = localStorage.getItem('edu-todo-pos');
        if (posSaved) {
          todoPanelPos.value = JSON.parse(posSaved);
        }
      } catch (e) {
        todoLists.value = [];
      }
    };

    // 拖拽开始
    const startTodoDrag = (e) => {
      e.preventDefault();
      isDraggingTodo = true;
      todoDragStart = {
        x: e.clientX,
        y: e.clientY,
        posX: todoPanelPos.value.x,
        posY: todoPanelPos.value.y
      };
      document.addEventListener('mousemove', onTodoDrag);
      document.addEventListener('mouseup', stopTodoDrag);
    };

    // 拖拽中
    const onTodoDrag = (e) => {
      if (!isDraggingTodo) return;
      const dx = e.clientX - todoDragStart.x;
      const dy = e.clientY - todoDragStart.y;
      // 限制在屏幕范围内
      const newX = Math.max(0, Math.min(window.innerWidth - 380, todoDragStart.posX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, todoDragStart.posY + dy));
      todoPanelPos.value = { x: newX, y: newY };
    };

    // 拖拽结束
    const stopTodoDrag = () => {
      isDraggingTodo = false;
      document.removeEventListener('mousemove', onTodoDrag);
      document.removeEventListener('mouseup', stopTodoDrag);
      // 保存位置
      localStorage.setItem('edu-todo-pos', JSON.stringify(todoPanelPos.value));
    };

    // ==================== 成长系统 ====================
    const growth = ref({
      level: 1,
      exp: 0,
      totalExp: 0,
      stats: {
        conversations: 0,        // 对话次数
        skillUses: 0,            // 技能使用次数
        bookmarksSaved: 0,       // 收藏书签数
        formulasRecognized: 0,   // 公式识别次数
        voiceChats: 0,           // 语音对话次数
        stagesCompleted: 0,      // 完成阶段数
        dailyLogins: 0,          // 每日登录天数
        continuousDays: 0,       // 连续使用天数
        pomodoros: 0,            // 番茄钟完成数
        todosCompleted: 0        // 待办完成数
      },
      lastLoginDate: null,      // 上次登录日期
      todayExpGained: 0         // 今日获得经验（用于限制每日上限）
    });

    // 经验获取配置
    const expRewards = {
      chat: 10,              // 普通对话
      voiceChat: 15,         // 语音对话（额外奖励）
      skillUse: 8,           // 使用技能
      stageComplete: 25,     // 完成一个阶段
      bookmarkSave: 5,       // 保存书签
      formulaRecognize: 12,  // 公式识别
      dailyLogin: 20,        // 每日登录
      continuousDay: 10,     // 连续使用（每天额外）
      achievementUnlock: 50, // 解锁成就
      firstSkillUse: 30,     // 首次使用某技能
      pomodoroComplete: 15,  // 完成番茄钟
      todoComplete: 5        // 完成待办任务
    };

    // 成就定义（与后端同步）
    const achievements = ref([
      // 基础成就
      { id: 'first_chat', name: '初次对话', description: '完成第一次对话', icon: 'fa-solid fa-comments', category: 'basic', reward: 30, unlocked: false },
      { id: 'skill_explorer', name: '技能探索者', description: '使用所有技能各1次', icon: 'fa-solid fa-wand-magic-sparkles', category: 'basic', reward: 50, unlocked: false },
      // 进阶成就
      { id: 'level_5', name: '进阶学者', description: '达到5级', icon: 'fa-solid fa-star', category: 'advanced', reward: 100, unlocked: false },
      { id: 'collaboration_master', name: '协作大师', description: '完成20次协作会话', icon: 'fa-solid fa-handshake', category: 'advanced', reward: 80, unlocked: false },
      { id: 'pomodoro_master', name: '番茄大师', description: '完成10个番茄钟', icon: 'fa-solid fa-clock', category: 'advanced', reward: 60, unlocked: false },
      { id: 'bookworm', name: '知识收藏家', description: '收藏20条知识书签', icon: 'fa-solid fa-bookmark', category: 'advanced', reward: 70, unlocked: false },
      // 挑战成就
      { id: 'level_10', name: '资深学者', description: '达到10级', icon: 'fa-solid fa-crown', category: 'challenge', reward: 200, unlocked: false },
      { id: 'todo_expert', name: '任务达人', description: '完成50个待办任务', icon: 'fa-solid fa-list-check', category: 'challenge', reward: 150, unlocked: false },
      { id: 'formula_master', name: '公式达人', description: '识别10个手写公式', icon: 'fa-solid fa-square-root-variable', category: 'challenge', reward: 100, unlocked: false },
      { id: 'stage_master', name: '阶段大师', description: '完成20个学习阶段', icon: 'fa-solid fa-flag-checkered', category: 'challenge', reward: 120, unlocked: false },
      // 隐藏成就
      { id: 'night_owl', name: '夜间学者', description: '在深夜使用研伴', icon: 'fa-solid fa-moon', category: 'hidden', reward: 50, unlocked: false },
      { id: 'voice_pioneer', name: '语音先锋', description: '进行10次语音对话', icon: 'fa-solid fa-microphone', category: 'hidden', reward: 80, unlocked: false }
    ]);

    // 成就分类配置
    const achievementCategories = {
      basic: { name: '基础成就', icon: 'fa-solid fa-seedling', color: '#10b981' },
      advanced: { name: '进阶成就', icon: 'fa-solid fa-medal', color: '#3b82f6' },
      challenge: { name: '挑战成就', icon: 'fa-solid fa-fire', color: '#f59e0b' },
      hidden: { name: '隐藏成就', icon: 'fa-solid fa-eye-slash', color: '#8b5cf6' }
    };

    // 成就详情弹窗状态
    const selectedAchievement = ref(null);
    const showAchievementDetail = ref(false);

    // 打开成就详情
    const openAchievementDetail = (achievement) => {
      selectedAchievement.value = achievement;
      showAchievementDetail.value = true;
    };

    // 关闭成就详情
    const closeAchievementDetail = () => {
      showAchievementDetail.value = false;
      selectedAchievement.value = null;
    };

    // 按分类获取成就
    const achievementsByCategory = computed(() => {
      const result = {};
      for (const [catKey, catInfo] of Object.entries(achievementCategories)) {
        const catAchievements = achievements.value.filter(a => a.category === catKey);
        if (catAchievements.length > 0) {
          result[catKey] = {
            ...catInfo,
            achievements: catAchievements,
            unlocked: catAchievements.filter(a => a.unlocked).length
          };
        }
      }
      return result;
    });

    // 统计卡片 - 与实际业务数据匹配
    const statCards = [
      { key: 'conversations', label: '对话次数', icon: 'fa-solid fa-comments' },
      { key: 'skillUses', label: '技能使用', icon: 'fa-solid fa-wand-magic-sparkles' },
      { key: 'bookmarksSaved', label: '知识书签', icon: 'fa-solid fa-bookmark' },
      { key: 'pomodoros', label: '番茄钟', icon: 'fa-solid fa-clock' }
    ];

    // ==================== 经验获取方法 ====================
    const addExp = async (amount, reason = '') => {
      const actualAmount = Math.min(amount, 100); // 单次最大100经验
      growth.value.exp += actualAmount;
      growth.value.totalExp += actualAmount;
      growth.value.todayExpGained += actualAmount;

      // 检查升级
      while (growth.value.exp >= expForNextLevel.value) {
        growth.value.exp -= expForNextLevel.value;
        growth.value.level++;
        // 升级奖励
        showAchievementNotification({
          name: `升级！Lv.${growth.value.level}`,
          description: `恭喜达到 ${growth.value.level} 级！`,
          icon: 'fa-solid fa-star'
        });
      }

      console.log(`[经验] +${actualAmount} (${reason})，当前: ${growth.value.exp}/${expForNextLevel.value}`);
      await checkAchievements();
    };

    // 检查每日登录奖励
    const checkDailyLogin = async () => {
      const today = new Date().toDateString();
      const lastLogin = growth.value.lastLoginDate;

      if (lastLogin !== today) {
        // 计算连续天数
        if (lastLogin) {
          const lastDate = new Date(lastLogin);
          const todayDate = new Date(today);
          const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            growth.value.stats.continuousDays++;
          } else {
            growth.value.stats.continuousDays = 1;
          }
        } else {
          growth.value.stats.continuousDays = 1;
        }

        growth.value.stats.dailyLogins++;
        growth.value.lastLoginDate = today;
        growth.value.todayExpGained = 0;

        // 每日登录奖励
        const loginBonus = expRewards.dailyLogin + (growth.value.stats.continuousDays - 1) * expRewards.continuousDay;
        await addExp(Math.min(loginBonus, 50), '每日登录');

        // 保存到本地
        localStorage.setItem('edu-growth', JSON.stringify(growth.value));
      }
    };

    // 技能使用奖励 - 仅用于首次使用检测和经验奖励，统计由后端统一处理
    const recordSkillUse = async (skillId) => {
      const isFirstUse = !skillUsage.value[skillId];
      skillUsage.value[skillId] = (skillUsage.value[skillId] || 0) + 1;

      if (isFirstUse) {
        await addExp(expRewards.firstSkillUse, `首次使用技能`);
      }
    };

    // 公式识别奖励
    const recordFormulaRecognize = async () => {
      growth.value.stats.formulasRecognized++;
      await addExp(expRewards.formulaRecognize, '公式识别');
    };

    // 语音对话奖励
    const recordVoiceChat = async () => {
      growth.value.stats.voiceChats++;
      await addExp(expRewards.voiceChat, '语音对话');
    };

    // 阶段完成奖励（同步到后端）
    const recordStageComplete = async (stageName) => {
      growth.value.stats.stagesCompleted++;
      growth.value.exp += 25;
      growth.value.totalExp += 25;
      // 同步到后端
      fetch(`/api/education/stages/record_complete?stage_name=${encodeURIComponent(stageName)}`, { method: 'POST' }).catch(() => {});
      console.log(`[阶段完成] ${stageName}，经验+25`);
    };

    // ==================== 协作记录 ====================
    const collaborationRecords = ref([]);
    const collabStats = ref({});
    const selectedRecord = ref(null);
    const collabFilter = ref('all');
    const collabViewMode = ref('list');  // 'list' | 'timeline'

    const collabFilters = [
      { key: 'all', label: '全部' },
      { key: 'paper', label: '论文写作' },
      { key: 'experiment', label: '实验设计' },
      { key: 'review', label: '文献综述' },
      { key: 'tutoring', label: '学习辅导' },
      { key: 'math', label: '数学助手' }
    ];

    // 时间线分组：按日期分组记录
    const groupedRecords = computed(() => {
      const records = filteredRecords.value;
      if (records.length === 0) return [];

      // 预计算今天和昨天的日期字符串
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

      // 按日期分组
      const dateMap = new Map();
      records.forEach(record => {
        const dateKey = record.startTime?.split('T')[0] || 'unknown';
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey).push(record);
      });

      // 转换为数组并添加标签
      const groups = [];
      const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

      sortedDates.forEach(dateKey => {
        let label;
        if (dateKey === todayStr) {
          label = '今天';
        } else if (dateKey === yesterdayStr) {
          label = '昨天';
        } else {
          // 格式化为 "X月X日"
          const [year, month, day] = dateKey.split('-');
          label = `${parseInt(month)}月${parseInt(day)}日`;
        }
        groups.push({
          date: dateKey,
          label,
          records: dateMap.get(dateKey).sort((a, b) =>
            new Date(b.startTime) - new Date(a.startTime)
          )
        });
      });

      return groups;
    });

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
    const settingsTab = ref('model');
    const settingsTabDirection = ref('left');

    const settingTabs = [
      { id: 'model', icon: 'fa-solid fa-microchip', label: '模型配置' },
      { id: 'formula', icon: 'fa-solid fa-square-root-variable', label: '公式识别' },
      { id: 'appearance', icon: 'fa-solid fa-palette', label: '外观' },
      { id: 'voice', icon: 'fa-solid fa-volume-high', label: '语音' },
      { id: 'about', icon: 'fa-solid fa-circle-info', label: '关于' }
    ];

    const tabOrder = ['model', 'formula', 'appearance', 'voice', 'about'];

    // 用 watch 追踪方向，不在点击事件里同时改两个 ref
    watch(settingsTab, (newVal, oldVal) => {
      const newIdx = tabOrder.indexOf(newVal);
      const oldIdx = tabOrder.indexOf(oldVal);
      settingsTabDirection.value = newIdx > oldIdx ? 'left' : 'right';
    });

    const settingsTabIndicator = computed(() => {
      const idx = tabOrder.indexOf(settingsTab.value);
      return { top: (16 + idx * 42) + 'px' };
    });

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

    const formulaOcrSettings = ref(JSON.parse(localStorage.getItem('edu-formula-ocr') || 'null') || {
      enabled: true,
      api_key: '',
      model: 'standard'
    });

    const displaySettings = ref(JSON.parse(localStorage.getItem('edu-display') || 'null') || {
      fontSize: 14,
      bubbleStyle: 'rounded'
    });

    const voiceSettings = ref(JSON.parse(localStorage.getItem('edu-voice') || 'null') || {
      speed: 1.0,
      volume: 80
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
    const speechRecognition = ref(null);
    const continuousVoiceMode = ref(false);  // 连续语音模式：自动重新启动识别
    let chatGeneration = 0; // 请求代际计数器，防止旧请求干扰新请求

    const initSpeechRecognition = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('浏览器不支持 Web Speech API');
        return null;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;  // 开启持续模式，支持连续对话
      recognition.interimResults = true;  // 开启实时结果，加快响应
      recognition.lang = 'zh-CN';
      return recognition;
    };

    // toggleVoiceRecording 已在下方语音方法区域定义

    // ==================== 主题切换 ====================
    const currentTheme = ref(localStorage.getItem('edu-theme') || 'dark');

    // ==================== 自动播报 ====================
    const autoSpeakEnabled = ref(localStorage.getItem('edu-auto-speak') !== 'false');

    // ==================== 知识书签 ====================
    const bookmarks = ref(JSON.parse(localStorage.getItem('edu-bookmarks') || '[]'));
    const bookmarkSearch = ref('');
    const bookmarkSkillFilter = ref('');

    const uniqueBookmarkSkills = computed(() => {
      const seen = new Map();
      bookmarks.value.forEach(bm => {
        if (!seen.has(bm.skill)) {
          seen.set(bm.skill, { id: bm.skill, name: bm.skillName });
        }
      });
      return [...seen.values()];
    });

    const filteredBookmarks = computed(() => {
      let list = bookmarks.value;
      if (bookmarkSkillFilter.value) {
        list = list.filter(bm => bm.skill === bookmarkSkillFilter.value);
      }
      if (bookmarkSearch.value.trim()) {
        const q = bookmarkSearch.value.trim().toLowerCase();
        list = list.filter(bm => bm.content.toLowerCase().includes(q));
      }
      return list;
    });

    // ==================== 智能笔记 ====================
    const notes = ref([]);
    const noteSearch = ref('');
    const noteSkillFilter = ref('');
    const showNoteEditor = ref(false);
    const editingNote = ref(null);
    const viewingNote = ref(null);
    const relatedNotes = ref([]);
    const noteForm = ref({
      title: '',
      content: '',
      tagsInput: ''
    });
    const noteGenerating = ref(false);

    // 加载笔记
    const loadNotes = async () => {
      try {
        const res = await fetch('/api/education/notes?limit=100');
        if (res.ok) {
          const data = await res.json();
          notes.value = data.notes || [];
        }
      } catch (e) {
        console.error('加载笔记失败:', e);
      }
    };

    // 初始加载
    loadNotes();

    const uniqueNoteSkills = computed(() => {
      const skills = new Set();
      notes.value.forEach(n => {
        if (n.skill_name) skills.add(n.skill_name);
      });
      return [...skills];
    });

    const filteredNotes = computed(() => {
      let list = notes.value;
      if (noteSkillFilter.value) {
        list = list.filter(n => n.skill_name === noteSkillFilter.value);
      }
      if (noteSearch.value.trim()) {
        const q = noteSearch.value.trim().toLowerCase();
        list = list.filter(n =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.summary.toLowerCase().includes(q)
        );
      }
      return list;
    });

    // 打开笔记详情
    const openNoteDetail = async (note) => {
      viewingNote.value = note;
      // 加载相关笔记
      try {
        const res = await fetch(`/api/education/notes/${note.id}/related`);
        if (res.ok) {
          const data = await res.json();
          relatedNotes.value = data.related_notes || [];
        }
      } catch (e) {
        relatedNotes.value = [];
      }
    };

    // 编辑笔记
    const editNote = (note) => {
      editingNote.value = note;
      noteForm.value = {
        title: note.title,
        content: note.content,
        tagsInput: note.tags.join(', ')
      };
      viewingNote.value = null;
      showNoteEditor.value = true;
    };

    // 关闭编辑器
    const closeNoteEditor = () => {
      showNoteEditor.value = false;
      editingNote.value = null;
      noteForm.value = { title: '', content: '', tagsInput: '' };
    };

    // 保存笔记
    const saveNote = async () => {
      if (!noteForm.value.title || !noteForm.value.content) return;

      const tags = noteForm.value.tagsInput
        .split(/[,，]/)
        .map(t => t.trim())
        .filter(t => t);

      try {
        if (editingNote.value) {
          // 更新
          const res = await fetch(`/api/education/notes/${editingNote.value.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: noteForm.value.title,
              content: noteForm.value.content,
              tags: tags
            })
          });
          if (res.ok) {
            await loadNotes();
            closeNoteEditor();
          }
        } else {
          // 创建
          const res = await fetch('/api/education/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: noteForm.value.title,
              content: noteForm.value.content,
              tags: tags,
              skill_id: currentSkill.value,
              skill_name: currentSkillName.value
            })
          });
          if (res.ok) {
            await loadNotes();
            closeNoteEditor();
            // 更新成长统计
            growth.value.stats.notesCreated = (growth.value.stats.notesCreated || 0) + 1;
            growth.value.exp += 10;
            growth.value.totalExp += 10;
          }
        }
      } catch (e) {
        console.error('保存笔记失败:', e);
      }
    };

    // 删除笔记
    const deleteNoteConfirm = async (noteId) => {
      if (!confirm('确定要删除这条笔记吗？')) return;

      try {
        const res = await fetch(`/api/education/notes/${noteId}`, { method: 'DELETE' });
        if (res.ok) {
          notes.value = notes.value.filter(n => n.id !== noteId);
          viewingNote.value = null;
        }
      } catch (e) {
        console.error('删除笔记失败:', e);
      }
    };

    // 导出单条笔记为Word
    const exportNoteWord = async (noteId) => {
      try {
        const res = await fetch('/api/education/notes/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([noteId])
        });
        if (res.ok) {
          await downloadBlob(res, '笔记导出.docx');
        }
      } catch (e) {
        console.error('导出笔记失败:', e);
      }
    };

    // 导出全部笔记为Word
    const exportAllNotesWord = async () => {
      const ids = filteredNotes.value.map(n => n.id);
      if (ids.length === 0) return;

      try {
        const res = await fetch('/api/education/notes/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ids)
        });
        if (res.ok) {
          const filename = `研伴笔记_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.docx`;
          await downloadBlob(res, filename);
        }
      } catch (e) {
        console.error('导出笔记失败:', e);
      }
    };

    // AI生成笔记
    const generateNoteFromChat = async () => {
      if (messages.value.length < 2) {
        alert('需要先进行对话才能生成笔记');
        return;
      }

      noteGenerating.value = true;
      console.log('[笔记] 开始AI生成...');

      try {
        const res = await fetch('/api/education/notes/ai_generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.value.slice(-20).map(m => ({
              role: m.role,
              content: m.content
            })),
            skill_id: currentSkill.value,
            skill_name: currentSkillName.value,
            session_id: sessionId.value
          })
        });

        if (res.ok) {
          const data = await res.json();
          console.log('[笔记] AI生成完成:', data.note?.title);
          await loadNotes();
          // 更新成长统计
          growth.value.stats.notesCreated = (growth.value.stats.notesCreated || 0) + 1;
          growth.value.exp += 15;
          growth.value.totalExp += 15;
          // 显示成功提示
          showAchievementNotification({
            name: '笔记生成成功',
            description: `已创建笔记「${data.note?.title || '学习笔记'}」`,
            icon: 'fa-solid fa-note-sticky'
          });
          // 打开新生成的笔记
          if (data.note) {
            openNoteDetail(data.note);
          }
        } else {
          const err = await res.json();
          console.error('[笔记] 生成失败:', err);
          showAchievementNotification({
            name: '生成失败',
            description: err.detail || '请稍后重试',
            icon: 'fa-solid fa-exclamation-circle'
          });
        }
      } catch (e) {
        console.error('[笔记] AI生成笔记失败:', e);
        showAchievementNotification({
          name: '生成失败',
          description: '网络错误，请稍后重试',
          icon: 'fa-solid fa-exclamation-circle'
        });
      } finally {
        noteGenerating.value = false;
      }
    };

    // Markdown工具栏插入
    const insertMarkdown = (before, after) => {
      const textarea = document.querySelector('.ne-content');
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = noteForm.value.content;
      const selected = text.substring(start, end);
      noteForm.value.content = text.substring(0, start) + before + selected + after + text.substring(end);
      // 恢复焦点和选区
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
      }, 0);
    };

    // 简单的Markdown渲染
    const renderMarkdown = (content) => {
      if (!content) return '';
      return content
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
        .replace(/\n/g, '<br>');
    };

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
        'academic-tutoring': ['解释一下什么是机器学习', '帮我制定学习计划', '推荐学习资源', '如何提高学术写作能力？'],
        'math-assistant': ['帮我解这个微分方程', '手写公式识别怎么用？', '解释一下线性代数的特征值', '如何证明数学归纳法？']
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
        ],
        'math-assistant': [
          { title: '手写公式识别', description: '拍照/手写输入数学公式', prompt: '我手写了一个数学公式，请帮我识别并解析。你可以点击输入框旁边的"手写公式"按钮，在画板上写下你的公式，我会识别并帮你进一步分析和计算。也可以直接上传公式的图片。' },
          { title: '分步解题推导', description: '详细的数学解题过程', prompt: '请帮我详细推导以下数学题的解题过程：[输入题目或公式]。要求：1) 写出已知条件 2) 说明解题思路 3) 逐步推导，每一步标注依据 4) 给出最终答案和验证方法' },
          { title: 'LaTeX公式编辑', description: '数学公式的LaTeX代码', prompt: '请帮我将以下数学表达式转换为标准LaTeX代码：[输入数学表达式]。同时：1) 解释每个LaTeX命令的含义 2) 给出渲染效果 3) 提供常见的变体写法' },
          { title: '错题分析纠错', description: '找出计算错误并纠正', prompt: '请帮我分析以下解题过程中的错误：[粘贴你的解答]。要求：1) 逐步检查每一步 2) 标注出错的步骤 3) 解释错误原因 4) 给出正确解法 5) 总结这类题目的易错点' }
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

        // 技能使用分布图 - 使用 oklch 颜色
        const skillNames = skills.value.map(s => s.name);
        const skillValues = skills.value.map(s => skillUsage.value[s.id] || 0);
        const skillColors = [
          'oklch(0.72 0.15 160)',  // 青绿
          'oklch(0.72 0.13 230)',  // 天蓝
          'oklch(0.72 0.17 35)',   // 橙色
          'oklch(0.72 0.16 290)',  // 紫色
          'oklch(0.72 0.18 340)'   // 粉红
        ];

        skillChart.value = new Chart(skillCanvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: skillNames,
            datasets: [{
              data: skillValues.every(v => v === 0) ? [1, 1, 1, 1, 1] : skillValues,
              backgroundColor: skillColors.map(c => c.replace(')', ' / 0.2)')),
              borderColor: skillColors,
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { color: textSec, font: { size: 11, family: 'Outfit' }, padding: 12 } },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const value = context.raw;
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                    return `${context.label}: ${value} 次 (${percentage}%)`;
                  }
                }
              }
            },
            cutout: '60%'
          }
        });

        // 学习活动统计图 - 显示实际有业务逻辑的数据
        const stats = growth.value.stats;
        const activityLabels = ['对话', '技能使用', '书签', '番茄钟', '语音'];
        const activityData = [
          stats.conversations || 0,
          stats.skillUses || 0,
          stats.bookmarksSaved || 0,
          stats.pomodoros || 0,
          stats.voiceChats || 0
        ];
        const activityColors = [
          'oklch(0.72 0.15 160)',
          'oklch(0.72 0.13 230)',
          'oklch(0.72 0.17 35)',
          'oklch(0.72 0.16 290)',
          'oklch(0.72 0.18 340)'
        ];

        activityChart.value = new Chart(activityCanvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels: activityLabels,
            datasets: [{
              label: '学习活动',
              data: activityData,
              backgroundColor: activityColors.map(c => c.replace(')', ' / 0.2)')),
              borderColor: activityColors,
              borderWidth: 2,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true, ticks: { color: textTer, font: { size: 10 }, stepSize: 1 }, grid: { color: gridColor } },
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

              // 40006: 超时错误 - 给用户友好提示
              if (message.code === 40006) {
                console.warn('[魔珐SDK] 网络超时，可能是网络不稳定或服务繁忙');
                // 可选：显示提示给用户
                if (xingyunSession.value.isConnected) {
                  // 尝试恢复到idle状态
                  setTimeout(() => {
                    if (xingyunSession.value.sdk && xingyunSession.value.isConnected) {
                      try {
                        xingyunSession.value.sdk.interactiveidle();
                      } catch (e) {}
                    }
                  }, 500);
                }
              }
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
          // 代理字幕事件，覆盖SDK默认的字幕显示行为
          proxyWidget: {
            "subtitle_on": (data) => {
              console.log('字幕显示:', data);
              // 使用自定义字幕容器，不使用SDK默认的
              const container = document.querySelector('#xingyun-sdk-container');
              if (!container) return;

              // 查找或创建字幕元素
              let subtitleEl = container.querySelector('.edu-custom-subtitle');
              if (!subtitleEl) {
                subtitleEl = document.createElement('div');
                subtitleEl.className = 'edu-custom-subtitle';
                // 样式由CSS控制，这里只设置基本定位
                subtitleEl.style.cssText = `
                  position: absolute;
                  bottom: 12%;
                  left: 50%;
                  transform: translateX(-50%);
                  max-width: 65%;
                  max-height: 25vh;
                  min-width: 120px;
                  padding: 16px 28px;
                  border-radius: 24px;
                  font-family: var(--font-sans);
                  font-size: 15px;
                  font-weight: 400;
                  letter-spacing: 0.02em;
                  line-height: 1.7;
                  text-align: center;
                  white-space: pre-wrap;
                  word-wrap: break-word;
                  overflow-y: auto;
                  z-index: 100;
                  opacity: 0;
                  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                `;
                container.appendChild(subtitleEl);
              }

              // 设置字幕内容
              if (data && data.text) {
                subtitleEl.textContent = data.text;
              }
              // 显示动画
              requestAnimationFrame(() => {
                subtitleEl.style.opacity = '1';
              });
            },
            "subtitle_off": () => {
              console.log('字幕隐藏');
              const container = document.querySelector('#xingyun-sdk-container');
              if (!container) return;

              const subtitleEl = container.querySelector('.edu-custom-subtitle');
              if (subtitleEl) {
                subtitleEl.style.opacity = '0';
                // 延迟移除，让淡出动画生效
                setTimeout(() => {
                  if (subtitleEl.parentNode) {
                    subtitleEl.parentNode.removeChild(subtitleEl);
                  }
                }, 300);
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

    // ==================== 数字人集群方法 ====================

    // 集群状态
    const clusterActive = ref(false);
    const clusterMode = ref('roundtable');
    const clusterTopic = ref('');
    const clusterInput = ref('');
    const clusterMessages = ref([]);
    const clusterStatus = ref('idle');  // idle | connecting | discussing | paused
    const clusterSelectedRoles = ref(['innovator', 'skeptic']);
    const availableRoles = ref([]);
    const clusterMessagesRef = ref(null);
    const clusterSessionId = ref('');
    const clusterRoleCards = computed(() => {
      const selected = new Set(clusterSelectedRoles.value);
      return availableRoles.value.filter(r => selected.has(r.id));
    });  // 当前参与角色的展示信息（自动响应选择变化）
    const clusterSpeakingRoleId = ref('');  // 当前正在播报的角色ID
    const clusterAffectionMatrix = ref({});  // 好感度矩阵
    const clusterPanel = ref(null);  // 当前浮动面板: 'mode' | 'roles' | 'affection' | null
    const clusterChatExpanded = ref(false);  // 对话栏默认展开
    const clusterChatMode = ref(localStorage.getItem('cluster-chat-mode') || 'bottom');  // 'bottom' | 'sidebar'
    const clusterChatHeight = ref(parseInt(localStorage.getItem('cluster-chat-height')) || 450);  // 底部模式高度
    const clusterAbortController = ref(null);  // SSE 中断控制器
    const clusterCurrentRound = ref(0);  // 当前讨论轮次
    const clusterTotalRounds = ref(3);  // 总轮次
    const clusterCurrentSpeaker = ref('');  // 当前发言角色名称
    const clusterInterruptPending = ref(false);  // 等待角色回应插话
    const clusterThinkingRole = ref(null);  // { roleId, name, color } — 当前正在思考的角色

    // 历史面板状态
    const showClusterHistory = ref(false);
    const clusterHistory = ref([]);
    const clusterHistoryLoading = ref(false);
    const showClusterHistoryDetail = ref(false);
    const clusterHistoryDetail = ref(null);

    // 角色编辑器状态
    const showRoleEditor = ref(false);
    const editingRole = ref(null);
    const roleForm = ref({
      name: '',
      personality: '',
      expertiseStr: '',
      speaking_style: '',
      color: '#6366f1',
      system_prompt: ''
    });
    const roleMemories = ref([]);  // 当前编辑角色的记忆
    const roleRecommendation = ref(null);  // 角色推荐结果

    const clusterModes = [
      { id: 'roundtable', name: '圆桌讨论', icon: 'fa-solid fa-comments',
        description: '各角色按顺序发言，可引用前人观点，共同探讨话题',
        min_roles: 2, max_roles: 6 },
      { id: 'debate', name: '正反辩论', icon: 'fa-solid fa-scale-balanced',
        description: '正反方交替发言，互相反驳，引导用户思考',
        min_roles: 2, max_roles: 2 },
      { id: 'consultation', name: '导师会诊', icon: 'fa-solid fa-stethoscope',
        description: '各角色独立回答同一问题，最后汇总差异点',
        min_roles: 2, max_roles: 6 },
    ];

    const currentModeInfo = computed(() =>
      clusterModes.find(m => m.id === clusterMode.value)
    );

    const clusterMaxRoles = computed(() => currentModeInfo.value?.max_roles ?? 6);
    const clusterMinRoles = computed(() => currentModeInfo.value?.min_roles ?? 2);

    const canStartDiscussion = computed(() =>
      clusterTopic.value.trim() &&
      clusterSelectedRoles.value.length >= clusterMinRoles.value &&
      clusterStatus.value === 'idle'
    );

    // 进入集群页面
    const enterCluster = async () => {
      // 1. 销毁原页面 SDK（集群页面不使用数字人SDK）
      await closeXingYunSession();
      // 2. 激活集群页面
      clusterActive.value = true;
      // 3. 加载可用角色
      await loadClusterRoles();
    };

    // 退出集群页面
    const exitCluster = async () => {
      // 1. 关闭集群页面
      clusterActive.value = false;
      clusterMessages.value = [];
      clusterStatus.value = 'idle';
      clusterTopic.value = '';
      clusterInput.value = '';
      clusterAffectionMatrix.value = {};
      clusterPanel.value = null;
      clusterChatExpanded.value = false;
      clusterCurrentRound.value = 0;
      clusterTotalRounds.value = clusterModes.find(m => m.id === clusterMode.value)?.max_rounds || 3;
      clusterCurrentSpeaker.value = '';
      clusterInterruptPending.value = false;
      clusterThinkingRole.value = null;
      // 2. 恢复原页面 SDK
      await nextTick();
      await createXingYunSession();
    };

    const closeClusterChat = () => {
      // 讨论中不允许关闭
      if (clusterStatus.value === 'discussing') return;
      clusterChatExpanded.value = false;
    };

    // 模式切换 (底部 ↔ 侧边栏)
    const toggleClusterChatMode = () => {
      const oldMode = clusterChatMode.value;
      const newMode = oldMode === 'bottom' ? 'sidebar' : 'bottom';
      clusterChatMode.value = newMode;
      localStorage.setItem('cluster-chat-mode', newMode);

      const chatBar = document.querySelector('.cluster-chat-bar');
      if (chatBar) {
        chatBar.classList.remove('from-sidebar');
        if (oldMode === 'sidebar' && newMode === 'bottom') {
          chatBar.classList.add('from-sidebar');
          setTimeout(() => chatBar.classList.remove('from-sidebar'), 400);
        }
      }
    };

    // 高度拖拽
    let clusterDragStartY = 0;
    let clusterDragStartHeight = 0;

    const startClusterResize = (e) => {
      if (clusterChatMode.value !== 'bottom') return;
      clusterDragStartY = e.clientY;
      clusterDragStartHeight = clusterChatHeight.value;
      document.addEventListener('mousemove', onClusterResize);
      document.addEventListener('mouseup', stopClusterResize);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    };

    const onClusterResize = (e) => {
      const delta = clusterDragStartY - e.clientY;
      const newHeight = Math.max(300, Math.min(600, clusterDragStartHeight + delta));
      clusterChatHeight.value = newHeight;
      document.documentElement.style.setProperty('--cluster-chat-height', newHeight + 'px');
    };

    const stopClusterResize = () => {
      document.removeEventListener('mousemove', onClusterResize);
      document.removeEventListener('mouseup', stopClusterResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('cluster-chat-height', clusterChatHeight.value.toString());
    };

    // 初始化CSS变量
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--cluster-chat-height', clusterChatHeight.value + 'px');
    }

    // 导出当前讨论记录
    const exportCurrentSession = async () => {
      if (!clusterSessionId.value) {
        // 如果没有 sessionId，从消息构建导出
        const lines = [];
        lines.push('# 集群讨论记录\n');
        lines.push(`**话题**: ${clusterTopic.value}\n`);
        const modeName = clusterModes.find(m => m.id === clusterMode.value)?.name || clusterMode.value;
        lines.push(`**模式**: ${modeName}\n`);
        const roleNames = clusterSelectedRoles.value.map(id => availableRoles.value.find(r => r.id === id)?.name || id);
        lines.push(`**角色**: ${roleNames.join('、')}\n\n---\n`);
        for (const msg of clusterMessages.value) {
          if (msg.type === 'role') {
            lines.push(`\n**${msg.name}**: ${msg.content}\n`);
          } else if (msg.type === 'user') {
            lines.push(`\n**你**: ${msg.content}\n`);
          } else if (msg.type === 'system') {
            lines.push(`\n*${msg.content}*\n`);
          } else if (msg.type === 'summary') {
            lines.push('\n## 讨论总结\n');
            if (typeof msg.content === 'object') {
              if (msg.content.consensus) lines.push(`- **共识**: ${msg.content.consensus}\n`);
              if (msg.content.divergence) lines.push(`- **分歧**: ${msg.content.divergence}\n`);
              if (msg.content.suggestions) lines.push(`- **建议**: ${msg.content.suggestions}\n`);
            } else {
              lines.push(`${msg.content}\n`);
            }
          }
        }
        const blob = new Blob([lines.join('')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cluster-discussion.md`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      // 有 sessionId 时调用后端导出 API
      try {
        const res = await fetch('/api/cluster/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: clusterSessionId.value, format: 'markdown' })
        });
        if (!res.ok) throw new Error('导出失败');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cluster-${clusterSessionId.value.slice(0, 8)}.md`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('[集群导出] 错误:', e);
      }
    };

    // 加载可用角色列表
    const loadClusterRoles = async () => {
      try {
        const res = await fetch('/api/cluster/roles');
        availableRoles.value = await res.json();
      } catch (e) {
        console.error('加载集群角色失败:', e);
      }
    };

    // 集群语音播报（使用火山引擎 TTS，不使用数字人SDK）
    const toggleClusterPanel = (name) => {
      clusterPanel.value = clusterPanel.value === name ? null : name;
    };
    const onRoleRingClick = (role) => {
      if (clusterStatus.value === 'idle') {
        toggleClusterRole(role.id);
      } else {
        clusterPanel.value = clusterPanel.value === 'roles' ? null : 'roles';
      }
    };

    // 集群语音播报（使用火山引擎 TTS，不使用数字人SDK）
    const clusterSpeak = async (roleId, text) => {
      const clean = cleanTextForSpeak(text);
      if (!clean) return;

      clusterSpeakingRoleId.value = roleId;

      try {
        // 使用火山引擎 TTS 播报
        await clusterTTSSpeak(roleId, clean);
      } catch (e) {
        console.error(`集群TTS播报失败[${roleId}]:`, e);
      }

      clusterSpeakingRoleId.value = '';
    };

    // 火山引擎 TTS 播报
    const clusterTTSSpeak = async (roleId, text) => {
      try {
        const response = await fetch('/api/cluster/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            role_id: roleId
          })
        });

        if (!response.ok) {
          throw new Error(`TTS HTTP ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        return new Promise((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            reject(new Error('音频播放失败'));
          };
          audio.play().catch(reject);
        });
      } catch (e) {
        console.error(`集群TTS失败[${roleId}]:`, e);
        throw e;
      }
    };

    // 开始集群讨论
    const startClusterDiscussion = async (continueFrom = null) => {
      if (!canStartDiscussion.value && !continueFrom) return;

      clusterStatus.value = 'discussing';
      clusterChatExpanded.value = true;
      clusterMessages.value = [];
      clusterSessionId.value = 'cluster-' + Date.now();
      clusterCurrentRound.value = 0;
      clusterTotalRounds.value = clusterModes.find(m => m.id === clusterMode.value)?.max_rounds || 3;
      clusterCurrentSpeaker.value = '';
      clusterThinkingRole.value = null;

      // 添加系统消息
      const modeName = clusterModes.find(m => m.id === clusterMode.value)?.name || '讨论';
      clusterMessages.value.push({
        id: Date.now(),
        type: 'system',
        content: continueFrom ? `继续讨论：${clusterTopic.value}` : `开始${modeName}：${clusterTopic.value}`
      });

      // 创建 AbortController 用于超时和手动停止
      const abortController = new AbortController();
      clusterAbortController.value = abortController;

      // 5分钟超时保护（3轮×4角色+总结+记忆提取需要较长时间）
      const timeoutId = setTimeout(() => {
        if (clusterStatus.value === 'discussing') {
          abortController.abort();
          clusterCurrentSpeaker.value = '';
          clusterSpeakingRoleId.value = '';
          clusterThinkingRole.value = null;
          clusterMessages.value.push({
            id: Date.now(),
            type: 'system',
            content: '讨论超时（5分钟），已自动结束'
          });
        }
      }, 120000);

      let _scrollThrottle = null;

      try {
        const payload = {
          topic: clusterTopic.value,
          mode: clusterMode.value,
          roles: clusterSelectedRoles.value,
          max_rounds: clusterTotalRounds.value,
          session_id: clusterSessionId.value,
        };
        if (continueFrom) {
          payload.continue_from = continueFrom;
        }

        const response = await fetch('/api/cluster/discuss/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentRoleId = '';
        let currentRoleName = '';
        let currentColor = '';
        let currentContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'role_start') {
                currentRoleId = data.role_id;
                currentRoleName = data.role_name;
                currentColor = data.color || '#a5b4fc';
                currentContent = '';
                // 设置 thinking 指示器
                clusterThinkingRole.value = {
                  roleId: currentRoleId,
                  name: currentRoleName,
                  color: currentColor
                };
                // 更新角色环高亮和进度信息
                clusterSpeakingRoleId.value = currentRoleId;
                if (!data.interrupt_response) {
                  clusterCurrentSpeaker.value = currentRoleName;
                }
                await nextTick();
                if (clusterMessagesRef.value) {
                  clusterMessagesRef.value.scrollTop = clusterMessagesRef.value.scrollHeight;
                }
              } else if (data.type === 'role_chunk') {
                currentContent += data.content;
                const lastMsg = clusterMessages.value[clusterMessages.value.length - 1];
                // 首次收到内容时，清除 thinking 并添加实际角色消息
                if (clusterThinkingRole.value && clusterThinkingRole.value.roleId === currentRoleId) {
                  clusterThinkingRole.value = null;
                  clusterMessages.value.push({
                    id: Date.now() + Math.random(),
                    type: 'role',
                    roleId: currentRoleId,
                    name: currentRoleName,
                    color: currentColor,
                    content: currentContent
                  });
                } else if (lastMsg?.roleId === currentRoleId) {
                  lastMsg.content = currentContent;
                }
                // 节流滚动（每 300ms 一次，不阻塞数据接收）
                if (!_scrollThrottle) {
                  _scrollThrottle = setTimeout(() => {
                    _scrollThrottle = null;
                    if (clusterMessagesRef.value) {
                      clusterMessagesRef.value.scrollTop = clusterMessagesRef.value.scrollHeight;
                    }
                  }, 300);
                }
              } else if (data.type === 'role_end') {
                // 清除节流，立即滚动
                if (_scrollThrottle) {
                  clearTimeout(_scrollThrottle);
                  _scrollThrottle = null;
                }
                // 播报异步执行，不阻塞 SSE 读取
                clusterSpeak(currentRoleId, currentContent);
                currentRoleId = '';
                currentContent = '';
                // 不清空 clusterSpeakingRoleId，让下一个 role_start 覆盖，避免角色环闪烁
                await nextTick();
                if (clusterMessagesRef.value) {
                  clusterMessagesRef.value.scrollTop = clusterMessagesRef.value.scrollHeight;
                }
              } else if (data.type === 'round_start') {
                clusterCurrentRound.value = data.round;
              } else if (data.type === 'round_end') {
                // 轮次结束，添加分隔线
                clusterMessages.value.push({
                  id: Date.now() + Math.random(),
                  type: 'system',
                  content: `第 ${data.round} 轮讨论结束`
                });
              } else if (data.type === 'summary') {
                // 尝试解析结构化 JSON 总结，否则作为纯文本
                let summaryContent = data.content;
                try {
                  const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
                  if (parsed && typeof parsed === 'object') {
                    summaryContent = parsed;
                  }
                } catch (e) {
                  // 不是 JSON，保持原样
                }
                clusterMessages.value.push({
                  id: Date.now(),
                  type: 'summary',
                  content: summaryContent
                });
              } else if (data.type === 'affection_update') {
                const oldMatrix = clusterAffectionMatrix.value;
                const newMatrix = data.matrix || {};
                // 比较差异，触发浮动动画
                for (const [fromId, targets] of Object.entries(newMatrix)) {
                  for (const [toId, newVal] of Object.entries(targets)) {
                    const oldVal = (oldMatrix[fromId] && oldMatrix[fromId][toId]) || 50;
                    const delta = newVal - oldVal;
                    if (Math.abs(delta) >= 2) {
                      triggerAffectionFloat(fromId, toId, delta);
                    }
                  }
                }
                clusterAffectionMatrix.value = newMatrix;
              } else if (data.type === 'error') {
                clusterMessages.value.push({
                  id: Date.now(),
                  type: 'system',
                  content: `❌ 错误：${data.message}`
                });
              } else if (data.type === 'interrupt') {
                clusterInterruptPending.value = false;
                clusterMessages.value.push({
                  id: Date.now(),
                  type: 'system',
                  content: `💬 角色正在回应你的插话：${data.message}`
                });
              } else if (data.type === 'done') {
                clusterCurrentSpeaker.value = '';
                clusterSpeakingRoleId.value = '';
                clusterInterruptPending.value = false;
                clusterThinkingRole.value = null;
                clusterMessages.value.push({
                  id: Date.now(),
                  type: 'system',
                  content: '讨论结束'
                });
              }
            } catch (parseErr) {
              // 忽略解析错误
            }
          }
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          console.log('[集群讨论] 已中止');
        } else {
          console.error('集群讨论失败:', e);
          clusterCurrentSpeaker.value = '';
          clusterSpeakingRoleId.value = '';
          clusterThinkingRole.value = null;
          clusterMessages.value.push({
            id: Date.now(),
            type: 'system',
            content: `❌ 讨论失败: ${e.message || '未知错误'}`,
            retryable: true
          });
        }
      } finally {
        clearTimeout(timeoutId);
        if (_scrollThrottle) clearTimeout(_scrollThrottle);
        clusterAbortController.value = null;
        clusterStatus.value = 'idle';
      }
    };

    // 用户插话
    const sendClusterMessage = async () => {
      if (!clusterInput.value.trim() || clusterStatus.value !== 'discussing' || clusterInterruptPending.value) return;
      const msg = clusterInput.value.trim();
      clusterInput.value = '';

      clusterInterruptPending.value = true;
      clusterMessages.value.push({
        id: Date.now(),
        type: 'user',
        content: msg
      });

      try {
        const res = await fetch('/api/cluster/interrupt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: clusterSessionId.value,
            message: msg
          })
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (e) {
        console.error('插话失败:', e);
        clusterInterruptPending.value = false;
        clusterMessages.value.push({
          id: Date.now(),
          type: 'system',
          content: '插话发送失败: ' + (e.message || '网络错误')
        });
      }
    };

    // 停止集群讨论
    const stopClusterDiscussion = () => {
      if (clusterAbortController.value) {
        clusterAbortController.value.abort();
        clusterAbortController.value = null;
      }
      clusterStatus.value = 'idle';
      clusterCurrentSpeaker.value = '';
      clusterSpeakingRoleId.value = '';
      clusterInterruptPending.value = false;
      clusterThinkingRole.value = null;
      clusterMessages.value.push({
        id: Date.now(),
        type: 'system',
        content: '讨论已手动停止'
      });
    };

    // 好感度浮动提示（缓存 DOM 查询）
    let _affectionRingCache = null;
    const triggerAffectionFloat = (fromId, toId, delta) => {
      if (!_affectionRingCache || !_affectionRingCache.isConnected) {
        _affectionRingCache = document.querySelector('.cluster-role-ring');
      }
      if (!_affectionRingCache) return;
      const targetItem = _affectionRingCache.querySelector(`[data-role-id="${toId}"]`);
      if (!targetItem) return;

      const float = document.createElement('span');
      float.className = 'cluster-affection-float ' + (delta >= 0 ? 'positive' : 'negative');
      float.textContent = (delta >= 0 ? '+' : '') + delta;
      targetItem.appendChild(float);

      float.addEventListener('animationend', () => float.remove());
      setTimeout(() => { if (float.parentElement) float.remove(); }, 2500);
    };

    // 切换角色选择
    const toggleClusterRole = (roleId) => {
      const idx = clusterSelectedRoles.value.indexOf(roleId);
      if (idx >= 0) {
        if (clusterSelectedRoles.value.length > clusterMinRoles.value) {
          clusterSelectedRoles.value.splice(idx, 1);
        }
      } else {
        if (clusterSelectedRoles.value.length < clusterMaxRoles.value) {
          clusterSelectedRoles.value.push(roleId);
        }
      }
    };

    // ==================== 集群历史 ====================

    const loadClusterHistory = async () => {
      clusterHistoryLoading.value = true;
      try {
        const res = await fetch('/api/cluster/history?limit=50');
        const data = await res.json();
        clusterHistory.value = data.sessions || [];
      } catch (e) {
        console.error('加载集群历史失败:', e);
      } finally {
        clusterHistoryLoading.value = false;
      }
    };

    const viewClusterHistoryDetail = async (sessionId) => {
      try {
        const res = await fetch(`/api/cluster/history/${sessionId}`);
        const data = await res.json();
        clusterHistoryDetail.value = data;
        showClusterHistoryDetail.value = true;
      } catch (e) {
        console.error('加载讨论详情失败:', e);
      }
    };

    const deleteClusterHistoryItem = async (sessionId) => {
      if (!confirm('确定要删除这条讨论记录吗？')) return;
      try {
        await fetch(`/api/cluster/history/${sessionId}`, { method: 'DELETE' });
        clusterHistory.value = clusterHistory.value.filter(s => s.id !== sessionId);
        showClusterHistoryDetail.value = false;
        clusterHistoryDetail.value = null;
      } catch (e) {
        console.error('删除讨论记录失败:', e);
      }
    };

    const formatClusterTime = (timestamp) => {
      if (!timestamp) return '';
      const d = new Date(timestamp * 1000);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const continueFromHistory = (session) => {
      clusterTopic.value = session.topic;
      clusterMode.value = session.mode;
      clusterSelectedRoles.value = session.roles || [];
      showClusterHistoryDetail.value = false;
      showClusterHistory.value = false;
      // 延迟启动，确保状态更新
      nextTick(() => {
        startClusterDiscussion(session.id);
      });
    };

    const exportClusterHistory = async (sessionId, format) => {
      try {
        const res = await fetch('/api/cluster/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, format })
        });
        if (!res.ok) throw new Error('导出失败');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cluster-discussion.${format === 'docx' ? 'docx' : 'md'}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('导出失败:', e);
        alert('导出失败: ' + e.message);
      }
    };

    // 监听历史面板打开
    watch(showClusterHistory, (val) => {
      if (val) loadClusterHistory();
    });

    // ==================== 角色编辑器 ====================

    const editCustomRole = (role) => {
      editingRole.value = role;
      roleForm.value = {
        name: role.name,
        personality: role.personality || '',
        expertiseStr: (role.expertise || []).join(', '),
        speaking_style: role.speaking_style || '',
        color: role.color || '#6366f1',
        system_prompt: ''
      };
      // 加载完整角色信息（含 system_prompt）和记忆
      if (role.is_custom) {
        fetch(`/api/cluster/roles/custom/${role.id}`)
          .then(res => res.json())
          .then(data => {
            roleForm.value.system_prompt = data.system_prompt || '';
          })
          .catch(e => console.error('加载角色详情失败:', e));
      }
      // 加载角色记忆
      fetch(`/api/cluster/roles/${role.id}/memory`)
        .then(res => res.json())
        .then(data => {
          roleMemories.value = data.memories || [];
        })
        .catch(() => { roleMemories.value = []; });
      showRoleEditor.value = true;
    };

    const closeRoleEditor = () => {
      showRoleEditor.value = false;
      editingRole.value = null;
      roleForm.value = {
        name: '',
        personality: '',
        expertiseStr: '',
        speaking_style: '',
        color: '#6366f1',
        system_prompt: ''
      };
    };

    const saveCustomRole = async () => {
      if (!roleForm.value.name || !roleForm.value.system_prompt) return;

      const payload = {
        name: roleForm.value.name,
        personality: roleForm.value.personality,
        expertise: roleForm.value.expertiseStr.split(',').map(s => s.trim()).filter(Boolean),
        speaking_style: roleForm.value.speaking_style,
        color: roleForm.value.color,
        system_prompt: roleForm.value.system_prompt
      };

      try {
        if (editingRole.value?.is_custom) {
          // 更新
          await fetch(`/api/cluster/roles/custom/${editingRole.value.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          // 创建
          await fetch('/api/cluster/roles/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
        // 重新加载角色列表
        await loadClusterRoles();
        closeRoleEditor();
      } catch (e) {
        console.error('保存角色失败:', e);
        alert('保存失败: ' + e.message);
      }
    };

    const deleteCustomRoleConfirm = async () => {
      if (!editingRole.value?.id) return;
      if (!confirm(`确定要删除角色"${editingRole.value.name}"吗？`)) return;

      try {
        await fetch(`/api/cluster/roles/custom/${editingRole.value.id}`, { method: 'DELETE' });
        // 从已选角色中移除
        const idx = clusterSelectedRoles.value.indexOf(editingRole.value.id);
        if (idx >= 0) clusterSelectedRoles.value.splice(idx, 1);
        // 重新加载角色列表
        await loadClusterRoles();
        closeRoleEditor();
      } catch (e) {
        console.error('删除角色失败:', e);
        alert('删除失败: ' + e.message);
      }
    };

    const clearRoleMemory = async () => {
      if (!editingRole.value?.id) return;
      if (!confirm('确定要清除该角色的所有记忆吗？')) return;
      try {
        await fetch(`/api/cluster/roles/${editingRole.value.id}/memory`, { method: 'DELETE' });
        roleMemories.value = [];
      } catch (e) {
        console.error('清除记忆失败:', e);
      }
    };

    // ==================== 角色推荐 ====================

    const recommendClusterRoles = async () => {
      if (!clusterTopic.value.trim()) return;
      try {
        const res = await fetch('/api/cluster/roles/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: clusterTopic.value, mode: clusterMode.value })
        });
        const data = await res.json();
        roleRecommendation.value = data;
        // 自动选中推荐的角色
        if (data.recommended && data.recommended.length > 0) {
          clusterSelectedRoles.value = data.recommended.map(r => r.id);
        }
      } catch (e) {
        console.error('获取角色推荐失败:', e);
      }
    };

    const applyRecommendation = (roleId) => {
      toggleClusterRole(roleId);
    };

    const sendQuickText = async () => {
      if (!quickText.value.trim()) return;
      if (xingyunSession.value.isConnected && xingyunSession.value.sdk) {
        xingyunSession.value.sdk.speak(quickText.value, true, true);
      }
      quickText.value = '';
    };

    // ==================== 流式播报 ====================
    let speakBuffer = '';           // 累积文本缓冲
    let totalSpokenChars = 0;       // 已播报的总字符数
    let shouldStopSpeaking = false; // 是否应该停止播报（达到长度限制）
    let isStreamStarted = false;     // 流式播报是否已开始
    const MAX_SPEAK_CHARS = 220;    // 最大播报字符数

    /**
     * 清理文本，移除 LaTeX 公式和 Markdown 标记
     */
    const cleanTextForSpeak = (text) => {
      let cleaned = text;

      // 1. 移除块级 LaTeX 公式: $$...$$ 和 \[...\]
      cleaned = cleaned.replace(/\$\$[\s\S]*?\$\$/g, '');
      cleaned = cleaned.replace(/\\[[\s\S]*?\\]/g, '');

      // 2. 移除行内 LaTeX 公式: $...$ 和 \(...\)
      cleaned = cleaned.replace(/\$[^\$\n]+?\$/g, '');
      cleaned = cleaned.replace(/\\\([^)]+?\\\)/g, '');

      // 3. 移除 Markdown 标记
      cleaned = cleaned.replace(/[#*_`~>\[\]()!|\\]/g, '');

      // 4. 移除多余的空白字符
      cleaned = cleaned.replace(/\s+/g, ' ').trim();

      return cleaned;
    };

    const streamSpeak = (text) => {
      if (!xingyunSession.value.isConnected || !xingyunSession.value.sdk) return;
      if (shouldStopSpeaking) return;  // 已达到限制，不再处理新文本

      // 累积文本
      speakBuffer += text;

      // 检测句子结束符（中文和英文）
      const sentenceEnders = /[。！？!?.]/g;
      let match;

      while ((match = sentenceEnders.exec(speakBuffer)) !== null) {
        const idx = match.index + 1;
        const sentence = speakBuffer.substring(0, idx).trim();
        speakBuffer = speakBuffer.substring(idx);

        if (sentence.length < 2) continue;

        // 清理文本
        const cleanText = cleanTextForSpeak(sentence);
        if (cleanText.length < 2) continue;

        // 检查是否超过长度限制
        if (totalSpokenChars + cleanText.length > MAX_SPEAK_CHARS) {
          shouldStopSpeaking = true;
          console.log('[流式播报] 达到长度限制，停止添加新句子');
          // 发送结束标记
          if (isStreamStarted) {
            xingyunSession.value.sdk.speak('详细信息请看聊天栏输出。', false, true);
            isStreamStarted = false;
          }
          continue;
        }

        totalSpokenChars += cleanText.length;

        // 流式播报：第一句 is_start=true，后续 is_start=false，暂时不设置 is_end
        const isFirst = !isStreamStarted;
        isStreamStarted = true;

        console.log('[流式播报] 发送:', cleanText, 'isFirst:', isFirst);

        // 发送句子，is_end=false 表示还有后续
        xingyunSession.value.sdk.speak(cleanText, isFirst, false);
      }
    };

    // 流式播报结束，发送结束标记
    const endStreamSpeak = () => {
      if (!xingyunSession.value.isConnected || !xingyunSession.value.sdk) return;

      // 处理缓冲区中剩余的文本
      if (speakBuffer.trim()) {
        const cleanText = cleanTextForSpeak(speakBuffer);
        if (cleanText.length > 1 && !shouldStopSpeaking) {
          totalSpokenChars += cleanText.length;
          console.log('[流式播报] 发送剩余:', cleanText);
          xingyunSession.value.sdk.speak(cleanText, !isStreamStarted, true);
          isStreamStarted = false;
          speakBuffer = '';
          return;
        }
      }

      // 如果流式播报已开始，发送结束标记
      if (isStreamStarted) {
        console.log('[流式播报] 发送结束标记');
        // 发送空字符串作为结束标记
        xingyunSession.value.sdk.speak('', false, true);
        isStreamStarted = false;
      }

      speakBuffer = '';
    };

    // ==================== 停止播报 ====================
    const stopSpeaking = () => {
      // 清空队列
      speakQueue = [];
      speakBuffer = '';
      isProcessingQueue = false;

      // 停止魔珐SDK播报
      if (xingyunSession.value.sdk && xingyunSession.value.isConnected) {
        try {
          // 调用SDK的停止方法
          if (xingyunSession.value.sdk.stop) {
            xingyunSession.value.sdk.stop();
          }
          // 恢复到idle状态
          if (xingyunSession.value.sdk.interactiveidle) {
            xingyunSession.value.sdk.interactiveidle();
          }
        } catch (e) {
          console.error('[停止播报] SDK调用失败:', e);
        }
      }

      // 停止Web Speech API (备用)
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      console.log('[停止播报] 已停止所有播报');
    };

    const waitForSpeakEnd = () => {
      return new Promise((resolve) => {
        // 先等待开始说话
        const checkStart = setInterval(() => {
          if (xingyunSession.value.voiceState === 'speaking') {
            clearInterval(checkStart);
            // 然后等待说话结束
            const checkEnd = setInterval(() => {
              if (xingyunSession.value.voiceState !== 'speaking') {
                clearInterval(checkEnd);
                resolve();
              }
            }, 100);
          }
        }, 100);

        // 超时保护（最多等待10秒）
        setTimeout(() => {
          clearInterval(checkStart);
          resolve();
        }, 10000);
      });
    };

    const resetSpeakBuffer = () => {
      speakBuffer = '';
      speakQueue = [];
      isProcessingQueue = false;
      totalSpokenChars = 0;
      shouldStopSpeaking = false;
      isStreamStarted = false;  // 重置流式播报状态
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

    // ==================== 对话栏模式方法 ====================
    const toggleChatMode = () => {
      const oldMode = chatMode.value;
      const newMode = oldMode === 'bottom' ? 'sidebar' : 'bottom';
      chatMode.value = newMode;
      localStorage.setItem('edu-chat-mode', newMode);

      // 添加动画class
      const chatBar = document.querySelector('.chat-bar');
      if (chatBar) {
        // 移除旧的动画class
        chatBar.classList.remove('from-sidebar');
        // 如果从侧边栏切换到底部模式，添加动画class
        if (oldMode === 'sidebar' && newMode === 'bottom') {
          chatBar.classList.add('from-sidebar');
          // 动画结束后移除class
          setTimeout(() => {
            chatBar.classList.remove('from-sidebar');
          }, 400);
        }
      }
    };

    const startResize = (e) => {
      if (chatMode.value !== 'bottom') return;
      isResizing.value = true;
      dragStartY = e.clientY;
      dragStartHeight = chatHeight.value;
      document.addEventListener('mousemove', onResize);
      document.addEventListener('mouseup', stopResize);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    };

    const onResize = (e) => {
      if (!isResizing.value) return;
      const delta = dragStartY - e.clientY;
      const newHeight = Math.max(300, Math.min(600, dragStartHeight + delta));
      chatHeight.value = newHeight;
      // 更新CSS变量
      document.documentElement.style.setProperty('--chat-height', newHeight + 'px');
    };

    const stopResize = () => {
      isResizing.value = false;
      document.removeEventListener('mousemove', onResize);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // 保存高度到localStorage
      localStorage.setItem('edu-chat-height', chatHeight.value.toString());
    };

    // 初始化CSS变量
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--chat-height', chatHeight.value + 'px');
    }

    // ==================== 书签统计同步 ====================
    const syncBookmarkSave = () => {
      growth.value.stats.bookmarksSaved = (growth.value.stats.bookmarksSaved || 0) + 1;
      growth.value.exp += 5;
      growth.value.totalExp += 5;
      fetch('/api/education/bookmarks/record_save', { method: 'POST' }).catch(() => {});
    };

    const syncBookmarkDelete = () => {
      const oldExp = growth.value.exp;
      growth.value.stats.bookmarksSaved = Math.max(0, (growth.value.stats.bookmarksSaved || 0) - 1);
      // 取消收藏时减少经验（最小为0）
      growth.value.exp = Math.max(0, growth.value.exp - 5);
      growth.value.totalExp = Math.max(0, growth.value.totalExp - 5);
      console.log(`[书签删除] 经验: ${oldExp} -> ${growth.value.exp}`);
      fetch('/api/education/bookmarks/record_delete', { method: 'POST' }).catch(() => {});
    };

    // ==================== 书签方法 ====================
    const toggleBookmark = async (msg) => {
      if (msg.role !== 'assistant') return;

      const existingIdx = bookmarks.value.findIndex(b => {
        return (b.timestamp && b.timestamp === msg.timestamp) ||
               (b.content && msg.content && b.content.substring(0, 50) === msg.content.substring(0, 50));
      });

      if (existingIdx > -1) {
        bookmarks.value.splice(existingIdx, 1);
        syncBookmarkDelete();
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
        syncBookmarkSave();
      }
      localStorage.setItem('edu-bookmarks', JSON.stringify(bookmarks.value));
    };

    const deleteBookmark = async (bookmarkId) => {
      bookmarks.value = bookmarks.value.filter(b => b.id !== bookmarkId);
      localStorage.setItem('edu-bookmarks', JSON.stringify(bookmarks.value));
      syncBookmarkDelete();
    };

    const isBookmarked = (msg) => {
      if (msg.role !== 'assistant') return false;
      return bookmarks.value.some(b => {
        // 匹配：时间戳相同，或者内容前50字符相同
        return (b.timestamp && b.timestamp === msg.timestamp) ||
               (b.content && msg.content && b.content.substring(0, 50) === msg.content.substring(0, 50));
      });
    };

    // 删除单条消息
    const deleteMessage = async (index) => {
      if (index < 0 || index >= messages.value.length) return;

      const msg = messages.value[index];
      const confirmMsg = msg.role === 'user'
        ? '确定要删除这条消息吗？删除后AI的回复也会一并删除。'
        : '确定要删除这条AI回复吗？';

      if (!confirm(confirmMsg)) return;

      // 如果删除的是用户消息，同时删除下一条AI回复
      if (msg.role === 'user' && index + 1 < messages.value.length && messages.value[index + 1].role === 'assistant') {
        messages.value.splice(index, 2);
      } else {
        messages.value.splice(index, 1);
      }

      // 保存更新后的历史记录
      await saveChatHistory();
    };

    // 保存聊天历史到服务器
    const saveChatHistory = async () => {
      try {
        await fetch('/api/education/chat/history/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId.value,
            messages: messages.value
          })
        });
      } catch (error) {
        console.error('保存聊天历史失败:', error);
      }
    };

    const insertBookmarkToChat = (bookmark) => {
      chatInput.value = `请详细解释以下内容：\n${bookmark.content}`;
      chatExpanded.value = true;
    };

    // ==================== 技能方法 ====================
    // 使用 oklch 格式的技能颜色（感知均匀）
    const skillColors = {
      'research-assistant': 'oklch(0.72 0.15 160)',   // 青绿色
      'literature-review': 'oklch(0.72 0.13 230)',    // 天空蓝
      'paper-writing': 'oklch(0.72 0.17 35)',         // 橙色
      'academic-tutoring': 'oklch(0.72 0.16 290)',    // 紫色
      'math-assistant': 'oklch(0.72 0.18 340)'        // 粉红色
    };

    const getSkillColor = (skillId) => {
      return skillColors[skillId] || 'oklch(0.72 0.15 160)';
    };

    // 新建对话确认弹窗状态
    const showNewChatConfirm = ref(false);
    const pendingSkillId = ref(null);

    // 技能选择 - 联动新建对话
    const selectSkill = (skillId) => {
      // 如果点击的是当前技能，且已有对话内容，显示确认弹窗
      if (currentSkill.value === skillId && messages.value.length > 1) {
        pendingSkillId.value = skillId;
        showNewChatConfirm.value = true;
        return;
      }

      // 如果切换到不同技能，或当前无对话，直接新建
      if (currentSkill.value !== skillId || messages.value.length <= 1) {
        currentSkill.value = skillId;
        // 如果已有对话内容，自动开始新对话
        if (messages.value.length > 1) {
          startNewChat();
        }
      }
    };

    // 确认新建对话（从弹窗触发）
    const confirmNewChat = () => {
      showNewChatConfirm.value = false;
      if (pendingSkillId.value) {
        currentSkill.value = pendingSkillId.value;
        pendingSkillId.value = null;
      }
      startNewChat();
    };

    // 取消新建对话
    const cancelNewChat = () => {
      showNewChatConfirm.value = false;
      pendingSkillId.value = null;
    };

    // 开始新对话（核心逻辑）
    const startNewChat = () => {
      messages.value = [];
      sessionId.value = 'session_' + Date.now();
      currentStage.value = 0;
      processedStageCommands.value = new Set();  // 重置已处理的阶段命令
      chatExpanded.value = true;
      activePanel.value = null;

      // 显示欢迎语
      const greetings = {
        'research-assistant': `你好！我是**研友**的科研助手模式。\n\n我可以帮助你：\n- 设计实验方案\n- 构建研究假设\n- 选择合适的研究方法\n- 分析实验数据\n\n请告诉我你正在研究的课题，我们一起探讨！`,
        'literature-review': `你好！我是**研友**的文献综述模式。\n\n我可以帮助你：\n- 制定 PICO 检索框架\n- 设计检索策略和布尔逻辑\n- 使用 PRISMA 流程进行文献筛选\n- 评估文献质量和偏倚风险\n\n请告诉我你的研究主题或感兴趣的领域！`,
        'paper-writing': `你好！我是**研友**的论文写作模式。\n\n我可以帮助你：\n- 规划论文结构和章节\n- 润色学术语言表达\n- 处理引用格式 (APA/MLA/GB/T 7714)\n- 梳理论证逻辑\n\n请告诉我你正在撰写什么类型的论文？`,
        'academic-tutoring': `你好！我是**研友**的虚拟导师模式。\n\n我可以帮助你：\n- 解释复杂概念和知识点\n- 制定个性化学习计划\n- 解答学习中的疑问\n- 推荐学习资源和路径\n\n请告诉我你想学习什么内容？`,
        'math-assistant': `你好！我是**研友**的数学助手模式。\n\n我可以帮助你：\n- 识别手写数学公式（试试输入框旁的"手写公式"按钮）\n- 分步推导数学解题过程\n- 编写和转换 LaTeX 公式\n- 分析计算错误并纠正\n\n请输入你的数学问题，或者点击"手写公式"直接书写！`
      };

      const greeting = greetings[currentSkill.value] || `你好！我是**研友**。\n\n请告诉我你想了解什么，我会尽力帮助你。`;

      messages.value.push({
        role: 'assistant',
        content: greeting,
        timestamp: new Date().toISOString()
      });
      renderKatex();
    };

    const togglePanel = (panelId) => {
      if (activePanel.value === panelId) {
        activePanel.value = null;
      } else {
        activePanel.value = panelId;
      }
    };

    const startConversation = async () => {
      // 复用 startNewChat 逻辑
      startNewChat();
    };

    // ==================== 对话方法 ====================
    const sendMessage = async (voiceMode = false) => {
      if (!chatInput.value.trim()) return;

      // 递增代际计数器，旧请求的写入会被忽略
      chatGeneration++;
      const myGeneration = chatGeneration;
      isTyping.value = true;

      // 重置流式播报缓冲区
      resetSpeakBuffer();

      // 记录语音对话奖励
      if (voiceMode) {
        await recordVoiceChat();
      }

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
      isNearBottom.value = true;  // 发送新消息时重置滚动状态，确保自动滚动到底部

      await nextTick();
      scrollToBottom(true);  // 强制滚动到底部

      try {
        const history = messages.value.slice(-20).map(m => ({
          role: m.role,
          content: m.content
        }));

        const requestBody = {
          message: userMessage,
          skill_id: currentSkill.value,
          session_id: sessionId.value,
          history: history,
          // 传递当前阶段信息给AI
          current_stage: currentStage.value,
          stage_name: skillStagesList.value[currentStage.value]?.name || null
        };

        if (filePaths.length > 0) {
          requestBody.files = filePaths;
        }

        // ===== 流式请求 =====
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
        let fullReasoning = '';
        let expGained = 10;

        while (true) {
          // 代际检查：如果已被新请求取代，立即退出
          if (myGeneration !== chatGeneration) break;

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.error) {
                  if (myGeneration !== chatGeneration) break;
                  messages.value[assistantIndex].content = `抱歉，出现问题：${data.error}`;
                  messages.value[assistantIndex].isTyping = false;
                  break;
                }

                if (data.reasoning_content) {
                  if (myGeneration !== chatGeneration) break;
                  fullReasoning += data.reasoning_content;
                  messages.value[assistantIndex].reasoning += data.reasoning_content;
                }

                if (data.content) {
                  if (myGeneration !== chatGeneration) break;
                  fullContent += data.content;
                  messages.value[assistantIndex].content = fullContent;
                  scrollToBottom();

                  // 流式播报：检测完整句子后立即播报
                  if (voiceMode && autoSpeakEnabled.value && xingyunSession.value.isConnected) {
                    streamSpeak(data.content);
                  }
                }

                if (data.done) {
                  expGained = data.exp_gained || 10;
                }
              } catch (e) {}
            }
          }
        }

        // 代际检查：只有当前请求才写入最终结果
        if (myGeneration === chatGeneration) {
          // 如果只有思考内容没有正式回复，显示思考内容
          const finalContent = fullContent || fullReasoning || '（无回复）';
          messages.value[assistantIndex].content = finalContent;
          messages.value[assistantIndex].isTyping = false;
          renderKatex();
        } else {
          // 旧请求被取代，删除空的占位消息
          if (messages.value[assistantIndex] && !messages.value[assistantIndex].content) {
            messages.value.splice(assistantIndex, 1);
          }
          return; // 直接返回，不执行后续逻辑
        }
        renderKatex();

        // 阶段检测 & 上下文保存
        if (fullContent) {
          // 先检查AI的阶段跳转指令
          parseStageCommand(fullContent);
          // 检查AI的笔记生成指令
          parseNoteCommand(fullContent);
          // 检查AI的番茄钟控制指令
          parsePomodoroCommand(fullContent);
          // 再检测标记格式
          detectStageFromResponse(fullContent);
          saveSkillContext();
        }

        // 流式播报结束：发送结束标记
        if (voiceMode && autoSpeakEnabled.value && xingyunSession.value.isConnected) {
          endStreamSpeak();
        }

        // 非语音模式的播报逻辑
        if (!voiceMode && autoSpeakEnabled.value && fullContent) {
          const speakText = fullContent.replace(/[#*_`~>\[\]()!|\\]/g, '').replace(/\n+/g, '。').substring(0, 200);
          if (speakText.trim()) {
            // 魔珐星云播报（如果已连接）
            if (xingyunSession.value.isConnected && xingyunSession.value.sdk) {
              xingyunSession.value.sdk.interactiveidle();
              setTimeout(() => {
                xingyunSession.value.sdk.speak(speakText, true, true);
              }, 200);
            } else {
              // 魔珐未连接时使用 Web Speech API TTS 播报
              if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(speakText);
                utterance.lang = 'zh-CN';
                utterance.rate = 1.0;
                const voices = window.speechSynthesis.getVoices();
                const zhVoice = voices.find(v => v.lang.includes('zh'));
                if (zhVoice) utterance.voice = zhVoice;
                window.speechSynthesis.speak(utterance);
              }
            }
          }
        }

        if (expGained) {
          // 本地即时显示经验（后端已持久化）
          growth.value.exp += expGained;
          growth.value.totalExp += expGained;

          while (growth.value.exp >= expForNextLevel.value) {
            growth.value.exp -= expForNextLevel.value;
            growth.value.level++;
          }

          // 本地即时显示统计（后端 update_chat_stats 已持久化）
          if (currentSkill.value) {
            skillUsage.value[currentSkill.value] = (skillUsage.value[currentSkill.value] || 0) + 1;
            growth.value.stats.skillUses = (growth.value.stats.skillUses || 0) + 1;
          } else {
            growth.value.stats.conversations = (growth.value.stats.conversations || 0) + 1;
          }
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
        if (myGeneration === chatGeneration) {
          messages.value.push({
            role: 'assistant',
            content: `抱歉，连接出现问题：${error.message}\n\n请确保已在主界面配置 API Key。`,
            timestamp: new Date().toISOString()
          });
        }
      }

      // 只有当前代际的请求才能重置 isTyping
      if (myGeneration === chatGeneration) {
        isTyping.value = false;
        await nextTick();
        scrollToBottom();
        renderKatex();
      }
    };

    const scrollToBottom = (force = false) => {
      if (!chatMessages.value) return;

      // 如果不是强制滚动，检查用户是否在底部
      if (!force && !isNearBottom.value) {
        return;  // 用户正在查看历史消息，不自动滚动
      }

      chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
    };

    // 检测滚动位置，判断用户是否在底部
    const handleChatScroll = () => {
      if (!chatMessages.value) return;

      const { scrollTop, scrollHeight, clientHeight } = chatMessages.value;
      // 距离底部 100px 以内视为"在底部"
      const threshold = 100;
      isNearBottom.value = scrollHeight - scrollTop - clientHeight < threshold;
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
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const isSameYear = date.getFullYear() === now.getFullYear();

      if (isToday) {
        // 今天只显示时间
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      } else if (isSameYear) {
        // 同年显示月日时间
        return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' +
               date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      } else {
        // 不同年显示年月日时间
        return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' +
               date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      }
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
        tutoring: 'fa-solid fa-graduation-cap',
        math: 'fa-solid fa-square-root-variable'
      };
      return icons[type] || 'fa-solid fa-file';
    };

    const getTypeName = (type) => {
      const names = {
        paper: '论文写作',
        experiment: '实验设计',
        review: '文献综述',
        tutoring: '学习辅导',
        math: '数学助手'
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
        await downloadBlob(response, `协作记录_${new Date().toISOString().slice(0,10)}.docx`);
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
        await downloadBlob(response, `协作记录_${record.title || record.type}_${new Date().toISOString().slice(0,10)}.docx`);
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
        await downloadBlob(response, `学习报告_${new Date().toISOString().slice(0,10)}.docx`);
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
          chatExpanded.value = true;
          activePanel.value = null;
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

          // 从服务端同步公式识别设置
          if (data.formulaOcr) {
            formulaOcrSettings.value = data.formulaOcr;
            localStorage.setItem('edu-formula-ocr', JSON.stringify(data.formulaOcr));
          }
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    };

    const saveAllSettings = async () => {
      try {
        // 本地设置先保存
        localStorage.setItem('edu-display', JSON.stringify(displaySettings.value));
        localStorage.setItem('edu-voice', JSON.stringify(voiceSettings.value));
        localStorage.setItem('edu-formula-ocr', JSON.stringify(formulaOcrSettings.value));

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
          // 记录公式识别奖励
          await recordFormulaRecognize();
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
    const startRecording = async () => {
      if (!speechRecognition.value) {
        speechRecognition.value = initSpeechRecognition();
      }
      if (!speechRecognition.value) {
        alert('您的浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器。');
        return;
      }

      speechRecognition.value.onstart = () => {
        isRecording.value = true;
        console.log('Web Speech API: 开始识别');
      };

      speechRecognition.value.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript;

        // 实时显示识别中的文本
        chatInput.value = transcript;

        // 只有最终结果才发送消息
        if (lastResult.isFinal && transcript) {
          console.log('Web Speech API最终结果:', transcript);
          sendMessage(true);
        }
      };

      speechRecognition.value.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        isRecording.value = false;
        if (event.error === 'not-allowed') {
          alert('请允许浏览器访问麦克风权限。');
        } else if (event.error !== 'aborted') {
          alert('语音识别失败，请重试。');
        }
      };

      speechRecognition.value.onend = () => {
        console.log('Web Speech API: 识别结束');
        isRecording.value = false;

        // 连续语音模式：AI未在回复时自动重启识别
        if (continuousVoiceMode.value && !isTyping.value) {
          console.log('[连续语音] 自动重启识别...');
          setTimeout(() => {
            if (continuousVoiceMode.value && !isTyping.value && speechRecognition.value) {
              try {
                speechRecognition.value.start();
                console.log('[连续语音] 识别已重启');
              } catch (e) {
                console.error('[连续语音] 重启失败:', e);
              }
            }
          }, 500); // 短暂延迟，让AI有机会回复
        }
      };

      try {
        speechRecognition.value.start();
      } catch (e) {
        console.error('启动语音识别失败:', e);
        isRecording.value = false;
      }
    };

    const stopRecording = () => {
      // 关闭连续模式
      continuousVoiceMode.value = false;
      if (speechRecognition.value && isRecording.value) {
        speechRecognition.value.stop();
      }
      isRecording.value = false;
    };

    const toggleVoiceRecording = async () => {
      if (isRecording.value) {
        stopRecording();
      } else {
        // 开启连续语音模式
        continuousVoiceMode.value = true;
        await startRecording();
      }
    };

    // ==================== 成就方法 ====================
    const checkAchievements = async () => {
      const conditions = {
        'first_chat': growth.value.stats.conversations >= 1,
        'skill_explorer': Object.keys(skillUsage.value).length >= 5,
        'level_5': growth.value.level >= 5,
        'level_10': growth.value.level >= 10,
        'collaboration_master': (growth.value.stats.conversations || 0) >= 20,
        'formula_master': growth.value.stats.formulasRecognized >= 10,
        'bookworm': growth.value.stats.bookmarksSaved >= 20,
        'night_owl': new Date().getHours() >= 23 || new Date().getHours() < 5,
        'pomodoro_master': (growth.value.stats.pomodoros || 0) >= 10,
        'todo_expert': (growth.value.stats.todosCompleted || 0) >= 50,
        'voice_pioneer': (growth.value.stats.voiceChats || 0) >= 10,
        'stage_master': (growth.value.stats.stagesCompleted || 0) >= 20
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
            // 显示解锁通知（包含奖励经验）
            const reward = data.reward || achievement?.reward || 50;
            showAchievementNotification({
              ...achievement,
              name: achievement?.name || achievementId,
              description: `+${reward} 经验`
            });
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
        const [dashboardRes, achRes, collabRes, statsRes] = await Promise.all([
          fetch('/api/education/dashboard'),
          fetch('/api/education/achievements'),
          fetch('/api/education/collaboration'),
          fetch('/api/education/collaboration/stats')
        ]);

        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          growth.value.level = dashboardData.level || 1;
          growth.value.exp = dashboardData.exp || 0;
          growth.value.totalExp = dashboardData.totalExp || 0;
          growth.value.stats = dashboardData.stats || growth.value.stats;
          skillUsage.value = dashboardData.skillUsage || {};
        }

        if (achRes.ok) {
          const achData = await achRes.json();
          // 合并后端数据，保留前端默认值中的category和reward
          if (achData.achievements) {
            achData.achievements.forEach(serverAch => {
              const localAch = achievements.value.find(a => a.id === serverAch.id);
              if (localAch) {
                // 更新解锁状态和时间
                localAch.unlocked = serverAch.unlocked;
                localAch.unlockedAt = serverAch.unlockedAt;
                // 如果后端有新字段也更新
                if (serverAch.category) localAch.category = serverAch.category;
                if (serverAch.reward) localAch.reward = serverAch.reward;
              }
            });
          }
        }

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
      await checkDailyLogin();
      await loadData();
      await loadApiSettings();
      loadPomodoroState();
      loadTodoLists();
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

      // 监听聊天框滚动，检测用户是否在底部
      nextTick(() => {
        if (chatMessages.value) {
          chatMessages.value.addEventListener('scroll', handleChatScroll);
        }
      });
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

      // 对话栏模式
      chatMode,
      chatHeight,
      isResizing,
      toggleChatMode,
      startResize,

      // 书签
      bookmarks,
      bookmarkSearch,
      bookmarkSkillFilter,
      filteredBookmarks,
      uniqueBookmarkSkills,
      toggleBookmark,
      deleteBookmark,
      isBookmarked,
      insertBookmarkToChat,
      deleteMessage,

      // 智能笔记
      notes,
      noteSearch,
      noteSkillFilter,
      filteredNotes,
      uniqueNoteSkills,
      showNoteEditor,
      editingNote,
      viewingNote,
      relatedNotes,
      noteForm,
      noteGenerating,
      loadNotes,
      openNoteDetail,
      editNote,
      closeNoteEditor,
      saveNote,
      deleteNoteConfirm,
      exportNoteWord,
      exportAllNotesWord,
      generateNoteFromChat,
      parseNoteCommand,
      insertMarkdown,
      renderMarkdown,

      // 标签页
      tabs,

      // 技能
      skills,
      skillUsage,
      currentSkillName,
      currentSkillDetail,
      selectSkill,
      getSkillColor,
      currentStage,
      skillStagesList,
      skillToolbar,
      setStage,
      setUserStage,
      hasSavedContext,
      savedContextPreview,
      continueSkillContext,
      togglePanel,
      startConversation,
      quickQuestions,
      promptTemplates,

      // 成长系统
      growth,
      achievements,
      achievementCategories,
      achievementsByCategory,
      selectedAchievement,
      showAchievementDetail,
      openAchievementDetail,
      closeAchievementDetail,
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
      collabViewMode,
      filteredRecords,
      groupedRecords,
      showRecordDetail,
      getMergedContributions,
      refreshCollaboration,
      getTypeIcon,
      getTypeName,
      formatDate,

      // 番茄钟
      showPomodoro,
      pomodoroSettings,
      pomodoroState,
      pomodoroTask,
      pomodoroSettingsExpanded,
      pomodoroMusicEnabled,
      pomodoroVolume,
      pomodoroTracks,
      pomodoroCurrentTrack,
      pomodoroDisplay,
      pomodoroPhaseText,
      pomodoroProgress,
      pomodoroPercent,
      showCompletedPanel,
      pomodoroPanelPos,
      startPomodoroDrag,
      startPomodoro,
      pausePomodoro,
      resetPomodoro,
      skipPomodoro,
      updatePomodoroSetting,
      togglePomodoroMusic,
      selectPomodoroTrack,
      parsePomodoroCommand,

      // 待办事项
      showTodoPanel,
      todoLists,
      todoPanelPos,
      activeTodoList,
      newTodoText,
      newTodoDueDate,
      todayDate,
      currentTodoList,
      currentIncompleteTodos,
      currentCompletedTodos,
      hasIncompleteTodos,
      getTodoStats,
      isOverdue,
      formatDateShort,
      addTodoList,
      deleteTodoList,
      addTodo,
      completeTodo,
      restoreTodo,
      deleteTodo,
      completeAllTodos,
      clearCompletedTodos,
      startTodoDrag,

      // 数字人
      xingyunSession,
      statusText,
      createXingYunSession,
      closeXingYunSession,
      sendQuickText,

      // 设置
      showSettingsModal,
      settingsTab,
      settingsTabDirection,
      settingsTabIndicator,
      settingTabs,
      apiSettings,
      modelOptions,
      fastModelSettings,
      formulaOcrSettings,
      displaySettings,
      voiceSettings,
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

      // 新建对话
      showNewChatConfirm,
      confirmNewChat,
      cancelNewChat,
      startNewChat,

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
      continuousVoiceMode,
      toggleVoiceRecording,
      stopSpeaking,

      // 数字人集群
      clusterActive,
      clusterMode,
      clusterTopic,
      clusterInput,
      clusterMessages,
      clusterStatus,
      clusterSelectedRoles,
      availableRoles,
      clusterMessagesRef,
      clusterSessionId,
      clusterRoleCards,
      clusterModes,
      currentModeInfo,
      clusterMaxRoles,
      clusterMinRoles,
      canStartDiscussion,
      clusterSpeakingRoleId,
      clusterAffectionMatrix,
      clusterPanel,
      clusterChatExpanded,
      clusterCurrentRound,
      clusterTotalRounds,
      clusterCurrentSpeaker,
      clusterInterruptPending,
      clusterThinkingRole,
      // 历史面板
      showClusterHistory,
      clusterHistory,
      clusterHistoryLoading,
      showClusterHistoryDetail,
      clusterHistoryDetail,
      loadClusterHistory,
      viewClusterHistoryDetail,
      deleteClusterHistoryItem,
      formatClusterTime,
      continueFromHistory,
      exportClusterHistory,
      // 角色编辑器
      showRoleEditor,
      editingRole,
      roleForm,
      roleMemories,
      editCustomRole,
      closeRoleEditor,
      saveCustomRole,
      deleteCustomRoleConfirm,
      clearRoleMemory,
      // 角色推荐
      roleRecommendation,
      recommendClusterRoles,
      applyRecommendation,
      enterCluster,
      exitCluster,
      closeClusterChat,
      clusterChatMode,
      clusterChatHeight,
      toggleClusterChatMode,
      startClusterResize,
      exportCurrentSession,
      toggleClusterPanel,
      onRoleRingClick,
      stopClusterDiscussion,
      clusterAbortController,
      loadClusterRoles,
      startClusterDiscussion,
      sendClusterMessage,
      toggleClusterRole
    };
  }
}).mount('#app');
