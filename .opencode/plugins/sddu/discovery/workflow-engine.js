/**
 * Discovery工作流引擎
 * 实现7步需求挖掘流程
 */
import { CoachingModeEngine, CoachingLevel } from './coaching-mode';
import { DiscoveryStateValidator } from './state-validator';
/**
 * 7 步发现工作流定义
 */
export const DISCOVERY_WORKFLOW = [
    {
        id: 'problem-space',
        name: '问题空间探索',
        description: '背景理解、痛点挖掘、业务价值澄清',
        prompts: [
            '是什么触发这个想法？（用户反馈、数据分析、竞品观察、内部痛点？）',
            '如果不做这个功能会发生什么？',
            '当前用户是如何解决这个问题的？',
            '最痛的一个点是什么？用用户原话描述',
            '这个痛点发生的频率？影响的用户规模？',
            '痛点的紧迫性（现在必须解决 vs 可以稍后）',
            '预期带来的业务价值是什么？（增收、降本、提效、风控、体验）',
            '如何衡量成功？是否有明确的北极星指标？'
        ],
        outputField: 'problemSpaceExploration'
    },
    {
        id: 'user-persona',
        name: '用户画像与场景',
        description: '目标用户定义、用户场景还原、用户旅程地图',
        prompts: [
            '这个功能为谁而做？（用户角色细分）',
            '不同角色的诉求有何差异？',
            '谁有决策权？谁是最终使用者？谁是影响者？',
            '用户在什么场景下遇到这个问题？（时间、地点、上下文）',
            '触发这个问题的具体情境是什么？',
            '用户期望的「理想状态」是什么？',
            '当前的用户旅程是什么？包含痛点',
            '期望的用户旅程是什么？目标状态'
        ],
        outputField: 'userPersonaAndScenarios'
    },
    {
        id: 'requirement-classification',
        name: '需求分类与优先级',
        description: 'MoSCoW 分类、需求归类、优先级排序',
        prompts: [
            '必备需求（Must have）：没有这个功能产品无法使用',
            '期望需求（Should have）：显著提升用户体验',
            '惊喜需求（Nice to have）：超出预期，带来 wow 体验',
            '功能需求：用户需要完成什么任务',
            '体验需求：用户希望有什么感受',
            '合规需求：法律、安全、政策约束',
            '技术需求：性能、稳定性、扩展性',
            '使用 MoSCoW 法则（Must/Should/Could/Won\'t）进行优先级排序'
        ],
        outputField: 'requirementClassification'
    },
    {
        id: 'competitive-analysis',
        name: '竞品与方案调研',
        description: '竞品对标、替代方案评估',
        prompts: [
            '竞品是如何解决这个问题的？',
            '他们的方案有哪些优缺点？',
            '我们可以差异化的地方在哪里？',
            '除了我们设想的方案，还有哪些可能的解决路径？',
            '每个方案的优缺点、实现成本、用户价值是什么？',
            '推荐哪个方案？为什么？'
        ],
        outputField: 'competitiveAnalysis'
    },
    {
        id: 'risks-assumptions',
        name: '风险与假设识别',
        description: '关键假设、潜在风险',
        prompts: [
            '我们做这个功能基于哪些假设？',
            '哪些假设需要验证？',
            '如何设计 MVP 来验证这些假设？',
            '技术风险：是否有未知的技术难点？',
            '市场风险：用户需求是否真实存在？',
            '资源风险：是否有足够资源投入？',
            '合规风险：是否有政策或法律风险？'
        ],
        outputField: 'risksAssumptions'
    },
    {
        id: 'success-criteria',
        name: '成功标准定义',
        description: '定性指标、定量指标、验收标准',
        prompts: [
            '北极星指标是什么？',
            '次要指标有哪些？（转化率、留存率、活跃度等）',
            '目标数值和基线数据是多少？',
            '用户体验达到什么水平？（可用性测试评分、NPS）',
            '关键干系人的满意度如何衡量？',
            '达到什么标准算「成功上线」？',
            '达到 what standard 算「验证通过」？'
        ],
        outputField: 'successCriteria'
    },
    {
        id: 'scope-boundary',
        name: '范围边界划定',
        description: 'MVP/V1/未来版本规划',
        prompts: [
            '本次一定要做的是什么？',
            '本次明确不做的是什么？（防止范围蔓延）',
            '可以拆分到后续迭代的是什么？',
            'MVP 版本：最小可行产品，验证核心价值',
            'V1 版本：完整功能，满足主流场景',
            '未来版本：高级功能，差异化竞争',
            'MVP 版本的范围确定了吗？'
        ],
        outputField: 'scopeBoundary'
    }
];
/**
 * Discovery 工作流引擎
 */
export class DiscoveryWorkflowEngine {
    coachingModeEngine;
    config;
    stateMachine;
    constructor(config, stateMachine) {
        this.coachingModeEngine = new CoachingModeEngine();
        this.config = {
            autoUpdateState: false,
            onStatusChange: [],
            logLevel: 'info',
            ...config
        };
        this.stateMachine = stateMachine;
    }
    /**
     * 设置状态机用于状态联动
     */
    setStateMachine(stateMachine) {
        this.stateMachine = stateMachine;
    }
    /**
     * 注册状态变化回调
     */
    onStatusChange(callback) {
        this.config.onStatusChange?.push(callback);
    }
    /**
     * 通知状态变化
     */
    async notifyStatusChange(featureId, status, data) {
        if (this.config.onStatusChange && this.config.onStatusChange.length > 0) {
            for (const callback of this.config.onStatusChange) {
                try {
                    await Promise.resolve(callback(featureId, status, data));
                }
                catch (error) {
                    console.error('Error in status change callback:', error);
                }
            }
        }
        if (this.config.logLevel !== 'error') {
            console.log(`[DiscoveryWorkflow] Status changed for ${featureId}: ${status}`);
        }
    }
    /**
     * 执行整个工作流
     */
    async execute(context) {
        console.log(`🚀 开始执行 Discovery 工作流: ${context.featureName}`);
        // 通知状态变化 - pending -> running
        await this.notifyStatusChange(context.featureName, 'running');
        // 检测用户的辅导级别并应用相应策略
        const coachingLevel = this.coachingModeEngine.detectLevel(context.userInput);
        context = this.coachingModeEngine.applyCoachingStrategy(context, coachingLevel);
        const totalSteps = DISCOVERY_WORKFLOW.length;
        try {
            for (let i = context.currentStepIndex; i < totalSteps; i++) {
                context.currentStepIndex = i;
                const step = DISCOVERY_WORKFLOW[i];
                console.log(`步骤 ${i + 1}/${totalSteps}: ${step.name}`);
                // 根据辅导级别调整步骤提示
                const adjustedStep = await this.adjustStepByCoachingLevel(step, coachingLevel);
                // 执行单步操作
                const result = await this.executeStep(adjustedStep, context);
                if (!result.success) {
                    throw new Error(`步骤执行失败: ${step.name}. 错误: ${result.message}`);
                }
                // 更新上下文数据
                context.data[step.outputField] = result.output[step.outputField];
                // 如果不是最后一步，可以中断暂停
                if (i < totalSteps - 1) {
                    console.log(`✅ 步骤 "${step.name}" 完成`);
                }
            }
            // 在 discovery 完成后，分析并建议是否切分功能
            const splitSuggestions = this.suggestSplit(context);
            if (splitSuggestions.length > 0) {
                context.splitSuggestions = splitSuggestions;
                console.log(`🔍 检测到 "${context.featureName}" 可能需要切分，建议：`, splitSuggestions);
            }
            console.log(`🎉 Discovery 工作流执行完成: ${context.featureName}`);
            // 通知状态变化 - running -> completed
            await this.notifyStatusChange(context.featureName, 'completed', context);
            // 如果配置了自动更新状态且有状态机，则更新特性状态为 discovery 阶段
            if (this.config.autoUpdateState && this.stateMachine) {
                try {
                    await this.stateMachine.updateState(context.featureName.toLowerCase().replace(/\s+/g, '-'), 'discovered', context, 'DiscoveryWorkflowEngine', `Discovery workflow completed for feature: ${context.featureName}`);
                }
                catch (error) {
                    console.warn('Auto-update state failed:', error);
                }
            }
            return context;
        }
        catch (error) {
            console.error('Discovery 工作流执行失败:', error);
            // 通知状态变化 - running -> failed
            await this.notifyStatusChange(context.featureName, 'failed', { error: error instanceof Error ? error.message : 'Unknown error' });
            throw error;
        }
    }
    /**
     * 对单个步骤应用辅导级别调整
     */
    async adjustStepByCoachingLevel(step, coachingLevel) {
        const adjustedStep = { ...step };
        // 根据辅导级别调整提示词详细程度
        adjustedStep.prompts = this.coachingModeEngine.adjustPromptsByLevel(step.prompts, coachingLevel);
        return adjustedStep;
    }
    /**
     * 执行单步逻辑
     */
    async executeStep(step, context) {
        try {
            // 模拟 Agent 调用
            // 在实际实现中，这里应该调用 @sddu-discovery Agent 处理当前步骤
            const stepOutput = await this.callStepAgent(step, context);
            return {
                success: true,
                output: {
                    [step.outputField]: stepOutput
                },
                message: `步骤 ${step.id} 执行成功`
            };
        }
        catch (error) {
            return {
                success: false,
                output: {},
                message: `步骤 ${step.id} 执行失败: ${error instanceof Error ? error.message : '未知错误'}`
            };
        }
    }
    /**
     * 调用单个步骤的Agent
     * 这里是模拟实现，在实际中应该调用OpenCode Agent系统
     */
    async callStepAgent(step, context) {
        // 这里应该调用实际的 @sddu-discovery Agent，针对当前步骤进行交互
        // 因为这是一个虚拟的函数，返回模拟数据
        console.log(`Calling @sddu-discovery Agent for step: ${step.name}`);
        // 模拟用户输入或已有的回答
        const simulatedAnswer = `用户对步骤 "${step.name}" 的回答`;
        // 结合上下文提供更精确的问题
        const detailedContext = {
            stepId: step.id,
            stepName: step.name,
            stepDescription: step.description,
            prompts: step.prompts.map(prompt => ({ prompt, answer: simulatedAnswer })),
            context
        };
        // 返回处理后的结果
        return detailedContext;
    }
    /**
     * 从指定步骤恢复执行（支持中断续执行）
     */
    async resumeFromStep(startStepIndex, context) {
        // 设置从特定步骤开始位置
        context.currentStepIndex = startStepIndex;
        // 继续执行剩余流程
        return await this.execute(context);
    }
    /**
     * 分析上下文并根据需求复杂性提出切分建议
     * 在Discovery完成后，分析是否应该将大型feature分割为多个子feature
     */
    suggestSplit(context) {
        const suggestions = [];
        // 提取关键信息用于分析
        const problemScope = context.data.problemSpaceExploration?.output?.answer || '';
        const requirements = context.data.requirementClassification?.output?.answer || '';
        const userScenarios = context.data.userPersonaAndScenarios?.output?.answer || '';
        // 根据不同的因素判断是否建议切分
        // 1. 识别多个不同领域的功能（如 "用户管理和订单管理功能" ）
        const multiDomainRegex = /(和|&)?.*?(模块|功能|系统|服务)/gi;
        const multiDomainMatches = (requirements + problemScope + userScenarios).match(multiDomainRegex) || [];
        if (multiDomainMatches.length > 2) {
            suggestions.push(`多领域功能发现 - 建议按领域将 "${context.featureName}" 分割为多个子feature，例如：${this.extractDomains(problemScope, requirements)}`);
        }
        // 2. 检查是否存在独立的CRUD操作集
        const crudOperations = this.identifyCRUDOperations(requirements);
        if (crudOperations.length > 3) {
            suggestions.push(`复杂数据操作发现 - 建议将 "${context.featureName}" 按CRUD操作的实体分为多个小功能，例如：${crudOperations.join(', ')} 功能可分别实现`);
        }
        // 3. 检查是否存在多种用户角色需要不同的访问权限
        const userRoles = this.extractUserRoles(userScenarios);
        if (userRoles.length > 2) {
            suggestions.push(`多角色交互发现 - 建议按用户角色将 "${context.featureName}" 分割为针对不同角色的功能`);
        }
        // 4. 如果需求文本长度过长，可能表示复杂特性，适合拆分
        const totalTextLength = (problemScope + requirements + userScenarios).length;
        if (totalTextLength > 2000) {
            suggestions.push(`复杂feature识别 - "${context.featureName}" 需求复杂度较高，建议根据功能维度拆分为多个子feature以降低开发复杂度`);
        }
        // 5. 检查是否存在明显不同的用户场景路径
        const userJourneys = this.extractUserJourneys(userScenarios);
        if (userJourneys.length > 2) {
            suggestions.push(`多路径用户体验识别 - 建议按用户旅程将 "${context.featureName}" 拆分为不同路径的小功能，提高专注度`);
        }
        return suggestions;
    }
    /**
     * 辅助方法：从文本中提取可能的领域/子功能
     */
    extractDomains(problemScope, requirements) {
        // 使用通用正则表达式来提取可能的不同领域名词
        const domainRegex = /(\b\w+管理\b|\b\w+功能\b|\b\w+系统\b)/gi;
        const domains = Array.from(new Set([
            ...problemScope.match(domainRegex) || [],
            ...requirements.match(domainRegex) || []
        ].map(d => d.replace(/(功能|管理|系统)$/, '').trim())));
        return domains.splice(0, 3).map(domain => domain + '-feature').join(', '); // Limit to 3 suggestions
    }
    /**
     * 辅助方法：识别数据操作（CRUD）
     */
    identifyCRUDOperations(requirements) {
        const entities = [];
        const entityPatterns = [
            /(\b\w+)信息.*(?:新建|添加|创建)/gi,
            /(?:查看|查询|显示|读取).*(\b\w+信息?\b)/gi,
            /(?:编辑|修改|更新|变更).*(\b\w+)/gi,
            /(?:删除|移除).*(\b\w+)/gi
        ];
        for (const pattern of entityPatterns) {
            const matches = requirements.match(pattern) || [];
            for (const match of matches) {
                const extracted = match.replace(/(?:新建|添加|创建|查看|查询|显示|读取|编辑|修改|更新|变更|删除|移除|\s+)/gi, '').trim();
                if (extracted && !entities.includes(extracted)) {
                    entities.push(extracted);
                }
            }
        }
        return entities;
    }
    /**
     * 辅助方法：提取用户角色
     */
    extractUserRoles(userScenario) {
        const rolePattern = /\b(管理员|用户|访客|会员|VIP用户|游客|员工|经理|超级管理员|客服|普通用户)\b/gi;
        const roles = Array.from(new Set(userScenario.match(rolePattern) || []));
        return roles;
    }
    /**
     * 辅助方法：提取用户旅程路径数
     */
    extractUserJourneys(userScenario) {
        const journeyPattern = /(?:当.*时|当.*后|在.*过程中|流程.*|步骤.*|首先|然后|最后)/g;
        const matches = userScenario.match(journeyPattern) || [];
        // Count unique types of journey indicators
        return Array.from(new Set(matches)).slice(0, 5);
    }
    /**
     * 获取步骤总数
     */
    getTotalSteps() {
        return DISCOVERY_WORKFLOW.length;
    }
    /**
     * 获取当前进度
     */
    getCurrentProgress(context) {
        return Math.min(100, Math.round((context.currentStepIndex / this.getTotalSteps()) * 100));
    }
    /**
     * FR-110: Analyzes user input to identify common split patterns like frontend/backend separation, etc.
     */
    analyzeSplitSuggestion(userDescription) {
        const suggestions = {
            patterns: [],
            ambiguous: false,
            suggestions: []
        };
        // Define split patterns
        const SPLIT_PATTERNS = [
            {
                id: 'frontend-backend',
                name: '前后端分离',
                keywords: ['前端', '后端', 'frontend', 'backend', 'client', 'server', 'web', 'api', 'ui', 'service'],
                description: '识别到前端/后端分离架构，建议拆分为独立的前端和后端功能'
            },
            {
                id: 'multi-platform',
                name: '多端架构',
                keywords: ['ios', 'android', '移动端', 'pc端', '小程序', 'h5', 'app', 'web'],
                description: '识别到多端架构，建议按端拆分'
            },
            {
                id: 'admin-user',
                name: '管理后台+用户端',
                keywords: ['管理后台', '用户端', '后台', '前台', 'admin', 'user'],
                description: '识别到管理后台与用户端分离模式'
            }
        ];
        const lowerDesc = userDescription.toLowerCase();
        const matchedPatterns = [];
        for (const pattern of SPLIT_PATTERNS) {
            const hasMatch = pattern.keywords.some(kw => lowerDesc.includes(kw.toLowerCase()));
            if (hasMatch) {
                matchedPatterns.push(pattern);
            }
        }
        if (matchedPatterns.length === 0) {
            return null; // 未识别到拆分模式
        }
        // 如果同时匹配多个模式，标记为ambiguous
        suggestions.patterns = matchedPatterns;
        suggestions.ambiguous = matchedPatterns.length > 1;
        // Generate specific suggestions based on the matched patterns
        for (const pattern of matchedPatterns) {
            const suggItems = [];
            if (pattern.id === 'frontend-backend') {
                suggItems.push({
                    patternId: pattern.id,
                    patternName: pattern.name,
                    description: pattern.description,
                    suggestedChildren: [
                        { id: 'frontend', name: '前端应用', description: '负责用户界面和交互的部分' },
                        { id: 'backend', name: '后端服务', description: '负责业务逻辑和数据存储的部分' }
                    ]
                });
            }
            else if (pattern.id === 'multi-platform') {
                suggItems.push({
                    patternId: pattern.id,
                    patternName: pattern.name,
                    description: pattern.description,
                    suggestedChildren: [
                        { id: 'mobile', name: '移动应用', description: '支持iOS和Android的移动端应用' },
                        { id: 'web', name: 'Web应用', description: '基于浏览器的应用' }
                    ]
                });
            }
            else if (pattern.id === 'admin-user') {
                suggItems.push({
                    patternId: pattern.id,
                    patternName: pattern.name,
                    description: pattern.description,
                    suggestedChildren: [
                        { id: 'admin', name: '管理后台', description: '提供管理功能' },
                        { id: 'user', name: '用户端', description: '面向用户的前端应用' }
                    ]
                });
            }
            suggestions.suggestions.push(...suggItems);
        }
        return suggestions;
    }
}
// 只导出那些从其他模块导入的类型和类，而不包括此文件中定义的
export { CoachingLevel, DiscoveryStateValidator };
