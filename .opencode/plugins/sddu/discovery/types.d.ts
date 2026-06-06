/**
 * 发现阶段类型定义
 */
export interface DiscoveryStep {
    /** 步骤ID */
    id: string;
    /** 步骤名称 */
    name: string;
    /** 步骤描述 */
    description: string;
    /** 引导问题列表 */
    prompts: string[];
    /** 步骤输出字段名 */
    outputField: string;
}
export interface DiscoveryContext {
    /** 特性名称 */
    featureName: string;
    /** 用户输入的原始需求 */
    userInput: string;
    /** 当前步骤索引 */
    currentStepIndex: number;
    /** 上下文数据 */
    data: Record<string, any>;
    /** 进度追踪 */
    progress?: DiscoveryProgress;
    /** 功能拆分建议 */
    splitSuggestions?: string[];
}
export interface DiscoveryProgress {
    /** 各步骤完成状态 */
    stepStatus: Record<string, boolean>;
    /** 最后执行时间 */
    lastExecutedAt?: string;
    /** 当前步骤 */
    currentStep?: string;
}
export interface DiscoveryResult {
    /** 是否成功 */
    success: boolean;
    /** 结果数据 */
    data?: any;
    /** 错误信息 */
    error?: string;
}
export declare enum CoachingLevel {
    IDEA_STAGE = "idea",// 想法阶段
    PAIN_STAGE = "pain",// 痛点阶段
    SOLUTION_STAGE = "solution",// 方案阶段
    EXECUTION_STAGE = "execution"
}
export interface CoachingConfig {
    /** 水平描述 */
    level: CoachingLevel;
    /** 级别名称 */
    name: string;
    /** 干预程度 */
    intervention: 'high' | 'medium' | 'low' | 'minimal';
    /** 引导策略 */
    guidance: string;
}
export interface StepExecutionResult {
    /** 成功与否 */
    success: boolean;
    /** 步骤输出 */
    output: Record<string, any>;
    /** 状态消息 */
    message?: string;
}
export interface DiscoveryStateValidator {
}
