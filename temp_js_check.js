
    const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

    createApp({
      setup() {
        const activeTab = ref('skills');
        const digitalHumanType = ref('vrm');
        const currentSkill = ref(null);
        const quickText = ref('');
        const chatInput = ref('');
        const messages = ref([]);
        const isTyping = ref(false);
        const chatMessages = ref(null);
        const sessionId = ref('session_' + Date.now());

        // 对话历史管理
        const showHistoryModal = ref(false);
        const chatHistoryList = ref([]);
        const loadingHistory = ref(false);

        // 设置弹窗
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

        const xingyunSession = ref({
          sdk: null,
          status: 'disconnected',
          isConnected: false
        });

        // 魔珐星云 SDK 配置
        const xingyunConfig = ref({
          appId: '',
          appSecret: '',
          gatewayServer: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session'
        });

        // 模型选项
        const modelOptions = ref({
          enableThinking: false  // 是否启用深度思考
        });

        // 快速应答模型设置
        const fastModelSettings = ref({
          enabled: false,
          triggerMode: 'conditional',  // 'conditional' 或 'always'
          selectedProvider: null,
          conditionMaxLen: 100,  // 消息字数上限，0表示不限
          conditionNoNewline: true,  // 禁止换行消息
          conditionNoFiles: true  // 禁止带文件消息
        });

        // 公式识别设置
        const formulaOcrSettings = ref({
          enabled: true,
          api_key: '',
          model: 'standard'  // 'standard' 或 'turbo'
        });

        // 文件上传相关
        const uploadedFiles = ref([]);
        const fileInput = ref(null);

        // 手写公式相关
        const showHandwriteDialog = ref(false);
        const handwriteCanvas = ref(null);
        const handwriteResult = ref('');
        const handwriteLatexPreview = ref('');
        const handwriteRecognizing = ref(false);
        const handwriteDrawing = ref(false);
        const handwritePaths = ref([]);
        const handwriteCurrentPath = ref([]);
        const handwriteDpr = ref(1);

        // PDF 预览相关
        const showPdfPreviewDialog = ref(false);
        const pdfPreviewFile = ref(null);
        const pdfPreviewPages = ref([]);
        const pdfPreviewLoading = ref(false);
        const selectedPdfPages = ref([]);
        const pdfTotalPages = ref(0);
        const pdfPreviewScale = ref(0.5);

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

        const skillUsage = ref({});

        const skills = ref([
          { id: 'research-assistant', name: '科研助手', icon: 'fa-solid fa-flask', description: '苏格拉底式引导实验设计，培养科研思维' },
          { id: 'literature-review', name: '文献综述', icon: 'fa-solid fa-book-open', description: 'PRISMA系统综述方法，多数据库协同检索' },
          { id: 'paper-writing', name: '论文写作', icon: 'fa-solid fa-pen-fancy', description: '学术论文写作指导，支持多种引用格式' },
          { id: 'academic-tutoring', name: '虚拟导师', icon: 'fa-solid fa-graduation-cap', description: '个性化学习支持，答疑解惑' }
        ]);

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

        // 语音录制相关状态
        const isRecording = ref(false);
        const mediaRecorder = ref(null);
        const audioChunks = ref([]);
        const voiceWebSocket = ref(null);
        const audioContext = ref(null);

        // 技能详情数据
        const skillDetails = {
          'research-assistant': {
            name: '科研助手',
            icon: 'fa-solid fa-flask',
            description: '苏格拉底式引导实验设计，培养科研思维',
            gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
            features: [
              '文献检索与综述',
              '实验设计引导',
              '研究假设构建',
              '数据分析方法指导',
              '批判性思维培养',
              '学术诚信提醒'
            ]
          },
          'literature-review': {
            name: '文献综述',
            icon: 'fa-solid fa-book-open',
            description: 'PRISMA系统综述方法，多数据库协同检索',
            gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
            features: [
              'PICO 框架设计',
              '检索策略制定',
              'PRISMA 流程图',
              '文献质量评估',
              '纳入/排除标准',
              '偏倚风险识别'
            ]
          },
          'paper-writing': {
            name: '论文写作',
            icon: 'fa-solid fa-pen-fancy',
            description: '学术论文写作指导，支持多种引用格式',
            gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            features: [
              '论文结构规划',
              '学术语言润色',
              'APA/MLA/GB/T 7714',
              '论证逻辑梳理',
              '学术规范检查',
              '摘要和关键词优化'
            ]
          },
          'academic-tutoring': {
            name: '虚拟导师',
            icon: 'fa-solid fa-graduation-cap',
            description: '个性化学习支持，答疑解惑',
            gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)',
            features: [
              '个性化知识讲解',
              '学习路径规划',
              '难点答疑解惑',
              '学习进度追踪',
              '因材施教策略',
              '启发式提问引导'
            ]
          }
        };

        // 计算属性
        const isConnected = computed(() => {
          if (digitalHumanType.value === 'vrm') return true;
          return xingyunSession.value.isConnected;
        });

        const statusText = computed(() => {
          if (digitalHumanType.value === 'vrm') return 'VRM 已连接';
          if (xingyunSession.value.status === 'connecting') return '连接中...';
          if (xingyunSession.value.isConnected) return '已连接';
          return '未连接';
        });

        const currentSkillName = computed(() => {
          const skill = skills.value.find(s => s.id === currentSkill.value);
          return skill ? skill.name : '';
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

        const currentSkillDetail = computed(() => {
          if (!currentSkill.value) return null;
          return skillDetails[currentSkill.value] || null;
        });

        const filteredRecords = computed(() => {
          if (collabFilter.value === 'all') return collaborationRecords.value;
          return collaborationRecords.value.filter(r => r.type === collabFilter.value);
        });

        // 检查是否有流式内容正在显示（最后一条助手消息有内容）
        const hasStreamingContent = computed(() => {
          const lastMsg = messages.value[messages.value.length - 1];
          return lastMsg && lastMsg.role === 'assistant' && lastMsg.content && lastMsg.content.length > 0;
        });

        const quickQuestions = computed(() => {
          const questions = {
            'research-assistant': [
              '如何设计一个对照实验？',
              '帮我构建研究假设',
              '推荐合适的统计方法',
              '如何控制实验变量？'
            ],
            'literature-review': [
              '帮我制定检索策略',
              '什么是PRISMA流程？',
              '如何评估文献质量？',
              '帮我设计PICO框架'
            ],
            'paper-writing': [
              '如何写好论文摘要？',
              '论文Introduction怎么写？',
              'APA引用格式怎么用？',
              '如何梳理论证逻辑？'
            ],
            'academic-tutoring': [
              '解释一下什么是机器学习',
              '帮我制定学习计划',
              '推荐学习资源',
              '如何提高学术写作能力？'
            ]
          };
          return questions[currentSkill.value] || ['你好，请介绍一下你的功能'];
        });

        // 方法
        const switchAvatarType = (type) => {
          if (type === digitalHumanType.value) return;
          if (type === 'xingyun' && xingyunSession.value.isConnected) {
            closeXingYunSession();
          }
          digitalHumanType.value = type;
        };

        // 加载魔珐星云配置
        const loadXingYunConfig = async () => {
          try {
            const response = await fetch('/api/xingyun_digital_human/config');
            const data = await response.json();
            xingyunConfig.value = {
              appId: data.appId,
              appSecret: data.appSecret,
              gatewayServer: data.gatewayServer
            };
          } catch (error) {
            console.error('加载魔珐星云配置失败:', error);
          }
        };

        // 动态加载魔珐星云 SDK
        const loadXingYunSDK = () => {
          return new Promise((resolve, reject) => {
            if (typeof XmovAvatar !== 'undefined') {
              resolve();
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://media.xingyun3d.com/xingyun3d/general/litesdk/xmovAvatar@latest.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('魔珐星云 SDK 加载失败'));
            document.head.appendChild(script);
          });
        };

        const createXingYunSession = async () => {
          xingyunSession.value.status = 'connecting';
          try {
            // 动态加载 SDK
            await loadXingYunSDK();

            // 检查 SDK 是否可用
            if (typeof XmovAvatar === 'undefined') {
              throw new Error('魔珐星云 SDK 未加载，请检查网络连接或使用 localhost/https 访问');
            }

            // 确保配置已加载
            if (!xingyunConfig.value.appId) {
              await loadXingYunConfig();
            }

            // 创建魔珐星云 SDK 实例
            xingyunSession.value.sdk = new XmovAvatar({
              containerId: '#xingyun-sdk-container',
              appId: xingyunConfig.value.appId,
              appSecret: xingyunConfig.value.appSecret,
              gatewayServer: xingyunConfig.value.gatewayServer,
              hardwareAcceleration: "prefer-hardware",
              onMessage(message) {
                console.log('魔珐SDK消息:', message);
              },
              onStateChange(state) {
                console.log('魔珐SDK状态变化:', state);
              },
              onStatusChange(status) {
                console.log('魔珐SDK状态:', status);
              },
              onVoiceStateChange(status) {
                console.log('语音状态:', status);
              },
              enableLogger: false
            });

            // 初始化连接
            await xingyunSession.value.sdk.initModel('normal', (progress) => {
              console.log('资源加载进度:', progress);
              if (progress >= 100) {
                xingyunSession.value.isConnected = true;
                xingyunSession.value.status = 'connected';
              }
            });

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
          xingyunSession.value = { sdk: null, status: 'disconnected', isConnected: false };
        };

        const sendQuickText = async () => {
          if (!quickText.value.trim()) return;
          if (digitalHumanType.value === 'xingyun' && xingyunSession.value.isConnected && xingyunSession.value.sdk) {
            // 使用魔珐 SDK 的 speak 方法
            xingyunSession.value.sdk.speak(quickText.value, true, true);
          }
          quickText.value = '';
        };

        const selectSkill = (skillId) => {
          currentSkill.value = skillId;
        };

        const startConversation = () => {
          activeTab.value = 'chat';
          messages.value = [];
          sessionId.value = 'session_' + Date.now();

          // 根据技能生成个性化欢迎语
          const greetings = {
            'research-assistant': `你好！我是你的**科研助手**。\n\n我可以帮助你：\n- 设计实验方案\n- 构建研究假设\n- 选择合适的研究方法\n- 分析实验数据\n\n请告诉我你正在研究的课题，我们一起探讨！`,
            'literature-review': `你好！我是**文献综述专家**。\n\n我可以帮助你：\n- 制定 PICO 检索框架\n- 设计检索策略和布尔逻辑\n- 使用 PRISMA 流程进行文献筛选\n- 评估文献质量和偏倚风险\n\n请告诉我你的研究主题或感兴趣的领域！`,
            'paper-writing': `你好！我是**论文写作指导专家**。\n\n我可以帮助你：\n- 规划论文结构和章节\n- 润色学术语言表达\n- 处理引用格式 (APA/MLA/GB/T 7714)\n- 梳理论证逻辑\n\n请告诉我你正在撰写什么类型的论文？`,
            'academic-tutoring': `你好！我是你的**虚拟导师**。\n\n我可以帮助你：\n- 解释复杂概念和知识点\n- 制定个性化学习计划\n- 解答学习中的疑问\n- 推荐学习资源和路径\n\n请告诉我你想学习什么内容？`
          };

          const greeting = greetings[currentSkill.value] || `你好！我是**${currentSkillName.value}**。\n\n请告诉我你想了解什么，我会尽力帮助你。`;

          messages.value.push({
            role: 'assistant',
            content: greeting,
            timestamp: new Date().toISOString()
          });
        };

        // ==================== 对话历史管理 ====================

        // 加载历史会话列表
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

        // 加载指定会话
        const loadHistorySession = async (targetSessionId) => {
          try {
            const response = await fetch(`/api/education/chat/history?session_id=${targetSessionId}`);
            const data = await response.json();
            if (data.history) {
              messages.value = data.history;
              sessionId.value = targetSessionId;
              showHistoryModal.value = false;
              await nextTick();
              scrollToBottom();
            }
          } catch (error) {
            console.error('加载会话失败:', error);
            alert('加载会话失败');
          }
        };

        // 删除指定会话
        const deleteHistorySession = async (targetSessionId) => {
          if (!confirm('确定要删除这个会话吗？')) return;

          try {
            await fetch(`/api/education/chat/history/${targetSessionId}`, {
              method: 'DELETE'
            });
            chatHistoryList.value = chatHistoryList.value.filter(s => s.session_id !== targetSessionId);

            // 如果删除的是当前会话，清空消息
            if (sessionId.value === targetSessionId) {
              messages.value = [];
              sessionId.value = 'session_' + Date.now();
            }
          } catch (error) {
            console.error('删除会话失败:', error);
            alert('删除会话失败');
          }
        };

        // 清空当前对话
        const clearCurrentChat = () => {
          if (messages.value.length === 0) return;
          if (!confirm('确定要清空当前对话吗？')) return;

          messages.value = [];
          sessionId.value = 'session_' + Date.now();
        };

        // 清空所有历史
        const clearAllHistory = async () => {
          if (!confirm('确定要清空所有历史对话吗？此操作不可恢复！')) return;

          try {
            // 逐个删除
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

        // 监听模态框打开时加载历史
        watch(showHistoryModal, (newVal) => {
          if (newVal) {
            loadChatHistoryList();
          }
        });

        // ==================== API 设置管理 ====================

        // 加载 API 设置
        const loadApiSettings = async () => {
          try {
            const response = await fetch('/api/education/settings');
            if (response.ok) {
              const data = await response.json();
              apiSettings.value = {
                api_key: '',  // 始终为空，用户需要重新输入才能修改
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

        // 保存 API 设置
        const saveApiSettings = async () => {
          try {
            // 只发送非空字段，避免覆盖已配置的设置
            const settingsToSave = {};
            if (apiSettings.value.api_key && apiSettings.value.api_key.trim()) {
              settingsToSave.api_key = apiSettings.value.api_key.trim();
            }
            if (apiSettings.value.base_url) {
              settingsToSave.base_url = apiSettings.value.base_url.trim();
            }
            if (apiSettings.value.model) {
              settingsToSave.model = apiSettings.value.model.trim();
            }
            if (apiSettings.value.temperature !== undefined) {
              settingsToSave.temperature = apiSettings.value.temperature;
            }
            if (apiSettings.value.max_tokens !== undefined) {
              settingsToSave.max_tokens = apiSettings.value.max_tokens;
            }

            const response = await fetch('/api/education/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settingsToSave)
            });

            if (response.ok) {
              alert('设置保存成功！');
              showSettingsModal.value = false;
              // 重新加载设置以更新状态
              await loadApiSettings();
            } else {
              const error = await response.json();
              alert('保存失败: ' + (error.detail || '未知错误'));
            }
          } catch (error) {
            console.error('保存设置失败:', error);
            alert('保存设置失败');
          }
        };

        // 保存所有设置（包括快速模型和公式识别）
        const saveAllSettings = async () => {
          try {
            // 获取当前完整设置
            const currentSettingsResponse = await fetch('/api/education/settings');
            let currentSettings = {};
            if (currentSettingsResponse.ok) {
              currentSettings = await currentSettingsResponse.json();
            }

            // 合并设置
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

        // 加载快速模型设置
        const loadFastModelSettings = async () => {
          try {
            const response = await fetch('/api/education/settings');
            if (response.ok) {
              const data = await response.json();
              // 加载快速模型配置
              if (data.fast) {
                fastModelSettings.value = {
                  enabled: data.fast.enabled ?? false,
                  triggerMode: data.fast.triggerMode ?? 'conditional',
                  selectedProvider: data.fast.selectedProvider ?? null,
                  conditionMaxLen: data.fast.conditionMaxLen ?? 100,
                  conditionNoNewline: data.fast.conditionNoNewline ?? true,
                  conditionNoFiles: data.fast.conditionNoFiles ?? true
                };
              }
              // 加载模型选项
              if (data.modelOptions) {
                modelOptions.value = {
                  enableThinking: data.modelOptions.enableThinking ?? false
                };
              }
              // 如果没有选择快速模型提供商，默认选择一个不同的
              if (!fastModelSettings.value.selectedProvider && data.modelProviders && data.modelProviders.length > 1) {
                const currentProviderId = data.selectedProvider;
                const otherProvider = data.modelProviders.find(p => p.id !== currentProviderId);
                if (otherProvider) {
                  fastModelSettings.value.selectedProvider = otherProvider.id;
                }
              }
            }
          } catch (error) {
            console.error('加载快速模型设置失败:', error);
          }
        };

        // 加载公式识别设置
        const loadFormulaOcrSettings = async () => {
          try {
            const response = await fetch('/api/education/settings');
            if (response.ok) {
              const data = await response.json();
              // 加载公式识别配置
              if (data.formulaOcr) {
                formulaOcrSettings.value = {
                  enabled: data.formulaOcr.enabled ?? true,
                  api_key: data.formulaOcr.api_key ?? '',
                  model: data.formulaOcr.model ?? 'standard'
                };
              }
            }
          } catch (error) {
            console.error('加载公式识别设置失败:', error);
          }
        };

        // ========== 文件上传方法 ==========
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
          // 清空 input 以便重复选择同一文件
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

        // ========== 手写公式方法 ==========
        const initHandwriteCanvas = () => {
          nextTick(() => {
            if (!handwriteCanvas.value) return;
            const canvas = handwriteCanvas.value;
            const ctx = canvas.getContext('2d');
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            handwriteDpr.value = dpr;

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
          });
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
          const dpr = handwriteDpr.value;

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
            handwritePaths.value.push([...handwriteCurrentPath.value]);
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
          const ctx = canvas.getContext('2d');
          const dpr = handwriteDpr.value;
          ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

          ctx.strokeStyle = '#333';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          for (const path of handwritePaths.value) {
            if (path.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
              ctx.lineTo(path[i].x, path[i].y);
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
              // 渲染 LaTeX 预览
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

        // 监听手写对话框打开
        watch(showHandwriteDialog, (newVal) => {
          if (newVal) {
            nextTick(() => {
              initHandwriteCanvas();
            });
          }
        });

        // ========== PDF 预览方法 ==========
        const openPdfPreview = async (file) => {
          pdfPreviewFile.value = file;
          pdfPreviewLoading.value = true;
          pdfPreviewPages.value = [];
          selectedPdfPages.value = [];
          showPdfPreviewDialog.value = true;

          try {
            let filePath = file.path || file.url;

            // 如果是 blob URL，需要先上传到服务器
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

        // 监听设置弹窗打开时加载设置
        watch(showSettingsModal, (newVal) => {
          if (newVal) {
            loadApiSettings();
            loadFastModelSettings();
            loadFormulaOcrSettings();
          }
        });

        // 打字机效果配置
        const TYPEWRITER_SPEED = 15; // ms per character
        let typewriterQueue = [];
        let typewriterTimer = null;
        let isTypewriting = false;

        // 打字机显示函数
        const runTypewriter = (targetIndex) => {
          if (typewriterQueue.length === 0) {
            isTypewriting = false;
            return;
          }

          const char = typewriterQueue.shift();
          messages.value[targetIndex].content += char;
          scrollToBottom();

          typewriterTimer = setTimeout(() => {
            runTypewriter(targetIndex);
          }, TYPEWRITER_SPEED);
        };

        const sendMessage = async () => {
          if (!chatInput.value.trim() || isTyping.value) return;

          const userMessage = chatInput.value.trim();

          // 处理上传的文件
          let filePaths = [];
          if (uploadedFiles.value.length > 0) {
            // 上传文件到服务器
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

          // 清空已上传文件列表
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
            // 构建历史消息
            const history = messages.value.slice(-10).map(m => ({
              role: m.role,
              content: m.content
            }));

            // 构建请求体
            const requestBody = {
              message: userMessage,
              skill_id: currentSkill.value,
              session_id: sessionId.value,
              history: history
            };

            // 如果有文件，添加到请求中
            if (filePaths.length > 0) {
              requestBody.files = filePaths;
            }

            // 使用流式传输
            const response = await fetch('/api/education/chat/stream', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
              throw new Error('请求失败');
            }

            // 创建助手消息占位
            const assistantIndex = messages.value.length;
            messages.value.push({
              role: 'assistant',
              content: '',
              reasoning: '',  // 思考过程
              showReasoning: true,  // 默认展开思考过程
              timestamp: new Date().toISOString(),
              isTyping: true
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let emotion = 'neutral';
            let expGained = 10;

            // 重置打字机队列
            typewriterQueue = [];
            if (typewriterTimer) {
              clearTimeout(typewriterTimer);
              typewriterTimer = null;
            }

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

                    // 处理思考过程 (reasoning_content)
                    if (data.reasoning_content) {
                      messages.value[assistantIndex].reasoning += data.reasoning_content;
                    }

                    if (data.content) {
                      fullContent += data.content;
                      // 将新内容加入打字机队列
                      for (const char of data.content) {
                        typewriterQueue.push(char);
                      }

                      // 启动打字机（如果未启动）
                      if (!isTypewriting) {
                        isTypewriting = true;
                        runTypewriter(assistantIndex);
                      }
                    }

                    if (data.done) {
                      emotion = data.emotion || 'neutral';
                      expGained = data.exp_gained || 10;
                    }
                  } catch (e) {
                    // 忽略解析错误
                  }
                }
              }
            }

            // 等待打字机完成或超时
            const waitForTypewriter = () => {
              return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                  if (typewriterQueue.length === 0) {
                    clearInterval(checkInterval);
                    // 确保所有内容都显示
                    messages.value[assistantIndex].content = fullContent;
                    messages.value[assistantIndex].isTyping = false;
                    isTypewriting = false;
                    resolve();
                  }
                }, 50);
                // 超时保护：最多等待5秒
                setTimeout(() => {
                  clearInterval(checkInterval);
                  typewriterQueue = [];
                  isTypewriting = false;
                  messages.value[assistantIndex].content = fullContent;
                  messages.value[assistantIndex].isTyping = false;
                  resolve();
                }, 5000);
              });
            };

            await waitForTypewriter();

            // 确保消息有内容
            if (!messages.value[assistantIndex].content) {
              messages.value[assistantIndex].content = fullContent || '（无回复）';
            }

            // 更新经验值
            if (expGained) {
              growth.value.exp += expGained;
              growth.value.totalExp += expGained;

              // 检查升级
              while (growth.value.exp >= expForNextLevel.value) {
                growth.value.exp -= expForNextLevel.value;
                growth.value.level++;
              }

              // 更新统计
              growth.value.stats.conversations = (growth.value.stats.conversations || 0) + 1;

              // 检查成就
              await checkAchievements();
            }

            // 保存对话历史
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
        };

        const scrollToBottom = () => {
          if (chatMessages.value) {
            chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
          }
        };

        const formatMessage = (content) => {
          try {
            return marked.parse(content);
          } catch {
            return content.replace(/\n/g, '<br>');
          }
        };

        const formatTime = (timestamp) => {
          if (!timestamp) return '';
          const date = new Date(timestamp);
          return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
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

        const formatDate = (dateStr) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          return date.toLocaleString('zh-CN');
        };

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

        // ==================== 导出和学习报告功能 ====================

        const exportLoading = ref(false);
        const showExportMenu = ref(false);
        const selectedSessionIds = ref([]);
        const includeChatHistory = ref(false);

        // 格式转换：前端使用 docx，后端使用 word
        const convertFormat = (format) => format === 'docx' ? 'word' : format;

        // 切换会话选择
        const toggleSessionSelection = (sessionId) => {
          const index = selectedSessionIds.value.indexOf(sessionId);
          if (index > -1) {
            selectedSessionIds.value.splice(index, 1);
          } else {
            selectedSessionIds.value.push(sessionId);
          }
        };

        // 导出选中的协作记录
        const exportSelectedCollaborations = async () => {
          exportLoading.value = true;
          try {
            const requestBody = {
              format: 'word'
            };

            // 如果有选中的会话，只导出这些
            if (selectedSessionIds.value.length > 0) {
              requestBody.session_ids = selectedSessionIds.value;
            }

            // 是否包含聊天记录
            requestBody.include_chat_history = includeChatHistory.value;

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
            // 清除选择
            selectedSessionIds.value = [];
          } catch (e) {
            console.error('导出协作记录失败:', e);
            alert('导出失败: ' + e.message);
          } finally {
            exportLoading.value = false;
          }
        };

        // 导出单个协作记录
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
                format: convertFormat(format)
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
            const ext = 'docx';
            a.download = `协作记录_${record.title || record.type}_${new Date().toISOString().slice(0,10)}.${ext}`;
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

        // 导出所有协作记录
        const exportAllCollaborations = async (format = 'docx') => {
          exportLoading.value = true;
          try {
            const response = await fetch('/api/education/collaboration/export_all', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                format: convertFormat(format),
                session_type: collabFilter.value === 'all' ? null : collabFilter.value
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
            const ext = 'docx';
            a.download = `协作记录汇总_${new Date().toISOString().slice(0,10)}.${ext}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          } catch (e) {
            console.error('导出所有协作记录失败:', e);
            alert('导出失败: ' + e.message);
          } finally {
            exportLoading.value = false;
          }
        };

        // 生成学习报告
        const learningReport = ref(null);
        const reportLoading = ref(false);

        const generateLearningReport = async () => {
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

        // 导出学习报告文档
        const exportLearningReport = async (format = 'docx') => {
          reportLoading.value = true;
          try {
            const response = await fetch('/api/education/report/export', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ format: convertFormat(format) })
            });
            if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              throw new Error(errData.detail || '导出报告失败');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ext = 'docx';
            a.download = `学习报告_${new Date().toISOString().slice(0,10)}.${ext}`;
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

        // 显示学习报告弹窗
        const showReportModal = ref(false);

        const openReportModal = async () => {
          showReportModal.value = true;
          await generateLearningReport();
        };

        // ==================== 语音交互功能 ====================

        const toggleVoiceRecording = async () => {
          if (isRecording.value) {
            // 停止录音
            stopRecording();
          } else {
            // 开始录音
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

            // 创建 MediaRecorder
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
              // 停止所有音轨
              stream.getTracks().forEach(track => track.stop());

              // 处理录音
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
            // 将音频转换为 base64
            const reader = new FileReader();
            reader.onload = async (e) => {
              const base64Audio = e.target.result.split(',')[1];

              try {
                // 构建历史消息
                const history = messages.value.slice(-10).map(m => ({
                  role: m.role,
                  content: m.content
                }));

                // 构建请求参数，根据数字人类型决定路由
                const requestBody = {
                  audio_data: base64Audio,
                  skill_id: currentSkill.value,
                  session_id: sessionId.value,
                  language: 'zh',
                  digital_human_type: digitalHumanType.value,
                  history: history
                };

                // 如果是魔珐星云，标记需要前端驱动
                if (digitalHumanType.value === 'xingyun') {
                  requestBody.frontend_drive = true;
                }

                const response = await fetch('/api/education/voice/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                if (response.ok) {
                  // 添加用户消息（识别的文本）
                  if (data.text) {
                    messages.value.push({
                      role: 'user',
                      content: `🎤 ${data.text}`,
                      timestamp: new Date().toISOString()
                    });
                  }

                  // 添加助手回复
                  messages.value.push({
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date().toISOString()
                  });

                  // VRM 模式播放音频响应
                  if (data.audio_data && digitalHumanType.value === 'vrm') {
                    playAudioResponse(data.audio_data);
                  }

                  // 魔珐星云驱动数字人播报
                  if (digitalHumanType.value === 'xingyun' && xingyunSession.value.isConnected && xingyunSession.value.sdk && data.response) {
                    xingyunSession.value.sdk.speak(data.response, true, true);
                    console.log('魔珐星云已驱动播报');
                  }

                  // 更新经验值
                  if (data.exp_gained) {
                    growth.value.exp += data.exp_gained;
                    growth.value.totalExp += data.exp_gained;

                    while (growth.value.exp >= expForNextLevel.value) {
                      growth.value.exp -= expForNextLevel.value;
                      growth.value.level++;
                    }

                    growth.value.stats.conversations = (growth.value.stats.conversations || 0) + 1;

                    // 检查成就
                    await checkAchievements();
                  }

                  await nextTick();
                  scrollToBottom();
                } else {
                  throw new Error(data.detail || '语音对话失败');
                }
              } catch (error) {
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

        const playAudioResponse = (base64Audio) => {
          try {
            const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
            audio.play().catch(e => console.log('自动播放被阻止，需要用户交互'));
          } catch (error) {
            console.error('播放音频失败:', error);
          }
        };

        // WebSocket 语音连接（可选，用于实时交互）
        const connectVoiceWebSocket = () => {
          const wsUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/education/ws/voice`;

          voiceWebSocket.value = new WebSocket(wsUrl);

          voiceWebSocket.value.onopen = () => {
            console.log('语音 WebSocket 已连接');
            // 发送配置，包含数字人类型信息
            const configMsg = {
              type: 'config',
              skill_id: currentSkill.value,
              session_id: sessionId.value,
              language: 'zh',
              digital_human_type: digitalHumanType.value
            };

            // 如果是魔珐星云，标记需要前端驱动
            if (digitalHumanType.value === 'xingyun') {
              configMsg.frontend_drive = true;
            }

            voiceWebSocket.value.send(JSON.stringify(configMsg));
          };

          voiceWebSocket.value.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case 'recognized':
                // 显示识别的文本
                messages.value.push({
                  role: 'user',
                  content: `🎤 ${data.text}`,
                  timestamp: new Date().toISOString()
                });
                break;

              case 'response':
                // 显示 AI 回复
                messages.value.push({
                  role: 'assistant',
                  content: data.text,
                  timestamp: new Date().toISOString()
                });
                // 魔珐星云驱动数字人播报
                if (digitalHumanType.value === 'xingyun' && xingyunSession.value.isConnected && xingyunSession.value.sdk && data.text) {
                  xingyunSession.value.sdk.speak(data.text, true, true);
                  console.log('魔珐星云已驱动播报');
                }
                break;

              case 'audio':
                // 播放音频（仅 VRM 模式会收到）
                playAudioResponse(data.data);
                break;

              case 'digital_human_driven':
                // 数字人驱动状态（保留兼容）
                console.log('数字人驱动状态:', data.success ? '成功' : '失败');
                break;

              case 'emotion':
                // 处理情绪（可以用于数字人表情）
                console.log('Emotion:', data.emotion);
                break;

              case 'error':
                console.error('WebSocket 错误:', data.message);
                break;
            }

            nextTick(() => scrollToBottom());
          };

          voiceWebSocket.value.onerror = (error) => {
            console.error('WebSocket 错误:', error);
          };

          voiceWebSocket.value.onclose = () => {
            console.log('语音 WebSocket 已断开');
          };
        };

        // ==================== 成就系统 ====================

        const checkAchievements = async () => {
          // 检查所有成就条件
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
                // 更新本地状态
                const achievement = achievements.value.find(a => a.id === achievementId);
                if (achievement) {
                  achievement.unlocked = true;
                  achievement.unlockedAt = new Date().toISOString();
                }

                // 显示通知
                showAchievementNotification(achievement);
              }
            }
          } catch (error) {
            console.error('解锁成就失败:', error);
          }
        };

        const showAchievementNotification = (achievement) => {
          // 创建通知元素
          const notification = document.createElement('div');
          notification.className = 'achievement-notification';
          notification.innerHTML = `
            <div class="achievement-notification-content">
              <i class="${achievement.icon}"></i>
              <div>
                <div class="achievement-title">🎉 成就解锁！</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
              </div>
            </div>
          `;

          // 添加样式
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
            z-index: 9999;
            animation: slideIn 0.5s ease, fadeOut 0.5s ease 3s forwards;
          `;

          // 添加动画样式
          if (!document.getElementById('achievement-styles')) {
            const style = document.createElement('style');
            style.id = 'achievement-styles';
            style.textContent = `
              @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
              @keyframes fadeOut {
                to { opacity: 0; transform: translateX(100%); }
              }
              .achievement-notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
              }
              .achievement-notification-content i {
                font-size: 32px;
              }
              .achievement-title {
                font-size: 12px;
                opacity: 0.8;
              }
              .achievement-name {
                font-size: 16px;
                font-weight: bold;
              }
              .achievement-desc {
                font-size: 12px;
                opacity: 0.8;
              }
            `;
            document.head.appendChild(style);
          }

          document.body.appendChild(notification);

          // 3.5秒后移除
          setTimeout(() => {
            notification.remove();
          }, 4000);
        };

        // 加载数据
        const loadData = async () => {
          try {
            // 加载仪表盘数据
            const dashboardRes = await fetch('/api/education/dashboard');
            if (dashboardRes.ok) {
              const dashboardData = await dashboardRes.json();
              growth.value.level = dashboardData.level || 1;
              growth.value.exp = dashboardData.exp || 0;
              growth.value.totalExp = dashboardData.totalExp || 0;
              growth.value.stats = dashboardData.stats || growth.value.stats;
              skillUsage.value = dashboardData.skillUsage || {};
            }

            // 加载成就
            const achRes = await fetch('/api/education/achievements');
            if (achRes.ok) {
              const achData = await achRes.json();
              achievements.value = achData.achievements || achievements.value;
            }

            // 加载协作记录
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

            // 加载协作统计
            const statsRes = await fetch('/api/education/collaboration/stats');
            if (statsRes.ok) {
              collabStats.value = await statsRes.json();
            }
          } catch (error) {
            console.error('加载数据失败:', error);
          }
        };

        onMounted(async () => {
          await loadData();
          setTimeout(() => {
            document.getElementById('loadingOverlay').classList.add('hidden');
          }, 500);

          // 点击外部关闭下拉菜单
          document.addEventListener('click', (e) => {
            if (showExportMenu.value && !e.target.closest('.export-dropdown')) {
              showExportMenu.value = false;
            }
          });
        });

        return {
          activeTab,
          digitalHumanType,
          currentSkill,
          quickText,
          chatInput,
          messages,
          isTyping,
          isRecording,
          chatMessages,
          xingyunSession,
          growth,
          skills,
          skillUsage,
          achievements,
          collaborationRecords,
          collabStats,
          selectedRecord,
          collabFilter,
          collabFilters,
          isConnected,
          statusText,
          currentSkillName,
          currentSkillDetail,
          levelTitle,
          expForNextLevel,
          expPercentage,
          unlockedAchievements,
          filteredRecords,
          hasStreamingContent,
          quickQuestions,
          switchAvatarType,
          createXingYunSession,
          closeXingYunSession,
          sendQuickText,
          selectSkill,
          startConversation,
          sendMessage,
          toggleVoiceRecording,
          formatMessage,
          formatTime,
          getTypeIcon,
          getTypeName,
          formatDate,
          showRecordDetail,
          getMergedContributions,
          refreshCollaboration,
          checkAchievements,
          // 导出和学习报告
          exportLoading,
          showExportMenu,
          selectedSessionIds,
          includeChatHistory,
          toggleSessionSelection,
          exportSelectedCollaborations,
          exportCollaboration,
          exportAllCollaborations,
          learningReport,
          reportLoading,
          generateLearningReport,
          exportLearningReport,
          showReportModal,
          openReportModal,
          // 对话历史管理
          showHistoryModal,
          chatHistoryList,
          loadingHistory,
          loadChatHistoryList,
          loadHistorySession,
          deleteHistorySession,
          clearCurrentChat,
          clearAllHistory,
          // 设置弹窗
          showSettingsModal,
          apiSettings,
          loadApiSettings,
          saveApiSettings,
          // 模型选项
          modelOptions,
          // 快速应答模型
          fastModelSettings,
          saveAllSettings,
          loadFastModelSettings,
          // 公式识别设置
          formulaOcrSettings,
          loadFormulaOcrSettings,
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
          startDrawing,
          draw,
          stopDrawing,
          clearHandwriteCanvas,
          undoHandwrite,
          recognizeHandwrite,
          insertHandwriteResult,
          // PDF 预览
          showPdfPreviewDialog,
          pdfPreviewPages,
          pdfPreviewLoading,
          selectedPdfPages,
          openPdfPreview,
          togglePdfPageSelection,
          selectAllPdfPages,
          clearPdfPageSelection,
          extractSelectedPdfPages
        };
      }
    }).mount('#app');
  