/**
 * 辅导模式引擎
 * 根据用户输入的详细程度和关键词自动判断用户所处的阶段，
 * 并提供相应的引导策略
 */
import { CoachingLevel } from './types';
export const COACHING_CONFIGS = {
    [CoachingLevel.IDEA_STAGE]: {
        level: CoachingLevel.IDEA_STAGE,
        name: '想法阶段',
        intervention: 'high',
        guidance: '全面引导，帮助结构化思考',
    },
    [CoachingLevel.PAIN_STAGE]: {
        level: CoachingLevel.PAIN_STAGE,
        name: '痛点阶段',
        intervention: 'medium',
        guidance: '聚焦问题挖掘，探索多种方案',
    },
    [CoachingLevel.SOLUTION_STAGE]: {
        level: CoachingLevel.SOLUTION_STAGE,
        name: '方案阶段',
        intervention: 'low',
        guidance: '评估方案合理性，识别遗漏需求',
    },
    [CoachingLevel.EXECUTION_STAGE]: {
        level: CoachingLevel.EXECUTION_STAGE,
        name: '执行阶段',
        intervention: 'minimal',
        guidance: '快速梳理，确认范围边界，进入规范编写',
    }
};
// 导出 CoachingLevel 以便其他模块使用
export { CoachingLevel };
export class CoachingModeEngine {
    /**
     * 检测用户的辅导级别
     * @param userInput 用户输入的原始需求，可为空字符串表示用户希望指定级别
     * @param desiredLevel 用户手动指定的等级
     * @returns CoachingLevel
     */
    detectLevel(userInput = '', desiredLevel) {
        // 如果用户手动指定了级别，则直接返回该级别
        if (desiredLevel && Object.values(CoachingLevel).includes(desiredLevel)) {
            return desiredLevel;
        }
        // 基于输入长度判断（<20 字为想法阶段）
        if (userInput.trim().length < 20) {
            return CoachingLevel.IDEA_STAGE;
        }
        // 基于关键词匹配算法
        const keywordScores = {
            [CoachingLevel.IDEA_STAGE]: 0,
            [CoachingLevel.PAIN_STAGE]: 0,
            [CoachingLevel.SOLUTION_STAGE]: 0,
            [CoachingLevel.EXECUTION_STAGE]: 0
        };
        // 转换为小写便于比较
        const lowerInput = userInput.toLowerCase();
        // 扫描关键词并分配分数
        this.scanKeywords(lowerInput).forEach(level => {
            keywordScores[level]++;
        });
        // 确定得分最高的等级
        let detectedLevel = CoachingLevel.IDEA_STAGE; // 默认想法阶段
        let maxScore = 0;
        Object.entries(keywordScores).forEach(([level, score]) => {
            if (score > maxScore) {
                maxScore = score;
                detectedLevel = level;
            }
        });
        // 如果最高得分仍为0，根据内容性质判断
        if (maxScore === 0) {
            if (lowerInput.includes('想') ||
                lowerInput.includes('需要') ||
                lowerInput.includes('感觉') ||
                lowerInput.includes('我觉得')) {
                return CoachingLevel.IDEA_STAGE;
            }
            else if (lowerInput.includes('问题') ||
                lowerInput.includes('痛点') ||
                lowerInput.includes('解决')) {
                return CoachingLevel.PAIN_STAGE;
            }
            else if (lowerInput.includes('方案') || lowerInput.includes('实现')) {
                return CoachingLevel.SOLUTION_STAGE;
            }
            else {
                return CoachingLevel.IDEA_STAGE; // 默认回退到想法阶段
            }
        }
        return detectedLevel;
    }
    /**
     * 扫描输入文本中的关键词
     */
    scanKeywords(input) {
        const levels = [];
        // 想法阶段关键词
        const ideaKeywords = ['想法', '概念', '想法是', '我想', '需要', '感觉', '觉得', '希望'];
        if (ideaKeywords.some(kw => input.includes(kw))) {
            levels.push(CoachingLevel.IDEA_STAGE);
        }
        // 痛点阶段关键词
        const painKeywords = ['问题', '痛点', '困扰', '麻烦', '效率低', '不方便', '不满意', '困难', '需要解决', '用户反馈'];
        if (painKeywords.some(kw => input.includes(kw))) {
            levels.push(CoachingLevel.PAIN_STAGE);
        }
        // 方案阶段关键词
        const solutionKeywords = ['方案', '实现', '技术', '架构', '开发', '功能', '怎么做', '开发流程', '技术方案', '实施'];
        if (solutionKeywords.some(kw => input.includes(kw))) {
            levels.push(CoachingLevel.SOLUTION_STAGE);
        }
        // 执行阶段关键词
        const executionKeywords = ['已经', '上线', '生产', '发布', '优化', '维护', '运营', '监控', '需求文档'];
        if (executionKeywords.some(kw => input.includes(kw))) {
            levels.push(CoachingLevel.EXECUTION_STAGE);
        }
        return levels;
    }
    /**
     * 获取辅导级别的引导策略
     */
    getGuidanceStrategy(level) {
        return COACHING_CONFIGS[level] || COACHING_CONFIGS[CoachingLevel.IDEA_STAGE]; // 默认回退到想法阶段
    }
    /**
     * 应用辅导策略到发现上下文中
     */
    applyCoachingStrategy(context, level) {
        const strategy = this.getGuidanceStrategy(level);
        // 基于辅导等级调整上下文参数
        // 这里可以根据级别来调整问题的详细程度、上下文信息等
        context.data.coachingLevel = level;
        context.data.coachingStrategy = strategy;
        console.log(`🎯 检测到用户处于 ${strategy.name}（${strategy.intervention} 干预级别）`);
        return context;
    }
    /**
     * 根据用户的辅导级别调整提示词详细程度
     */
    adjustPromptsByLevel(prompts, level) {
        const strategy = this.getGuidanceStrategy(level);
        // 根据干预级别调整提示词详细程度
        if (strategy.intervention === 'high') {
            // 对于高干预级别，提供更多引导性的详细问题
            return prompts.map(prompt => `[详细引导] ${prompt}`);
        }
        else if (strategy.intervention === 'medium') {
            // 中度干预，保持适中的详细程度
            return prompts.map(prompt => `[指导性] ${prompt}`);
        }
        else if (strategy.intervention === 'low') {
            // 低干预，给出较简洁的提示
            return prompts.map(prompt => `[简洁提醒] ${prompt}`);
        }
        else {
            // 极低干预，几乎不改变原提示
            return prompts;
        }
    }
}
