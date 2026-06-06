/**
 * 依赖就绪通知工具
 * 实现多子 Feature 场景下的依赖通知机制
 */
/**
 * 通知器配置接口
 */
export interface NotifierConfig {
    /** 是否启用通知功能 */
    enabled: boolean;
    /** 是否输出到控制台 */
    logToConsole?: boolean;
    /** 自定义通知回调 */
    onDependencyReady?: (subFeatureId: string, readyFor: string[]) => void;
}
/**
 * 通知结果接口
 */
export interface NotificationResult {
    /** 是否发送了通知 */
    notified: boolean;
    /** 已就绪的子特性列表 */
    readySubFeatures: string[];
    /** 通知消息 */
    message?: string;
}
/**
 * 创建默认配置
 */
export declare function createDefaultConfig(): NotifierConfig;
/**
 * 检查特定子特性是否已满足所有依赖条件
 * @param subFeatureId 要检查的子特性ID
 * @param dependencies 依赖关系映射：subFeatureId -> 依赖的其他子特性列表
 * @param subFeatureStates 子特性的状态映射
 * @returns 是否满足依赖条件
 */
export declare function isDependencyReady(subFeatureId: string, dependencies: Record<string, string[]>, subFeatureStates: Map<string, {
    status: string;
    phase: number;
}>): boolean;
/**
 * 找到所有依赖于指定子特性的其他子特性
 * @param completedSubFeatureId 已完成的子特性ID
 * @param dependencies 依赖关系映射：subFeatureId -> 依赖的其他子特性列表
 * @returns 依赖于指定子特性的子特性ID数组
 */
export declare function findDependentSubFeatures(completedSubFeatureId: string, dependencies: Record<string, string[]>): string[];
/**
 * 通知依赖已就绪
 * 当一个子特性状态发生变更时，检查哪些其他子特性的依赖条件已经满足
 * @param completedSubFeatureId 完成的子特性ID
 * @param dependencies 依赖关系映射
 * @param subFeatureStates 所有子特性的状态
 * @param config 不可配置项
 * @returns 通知结果
 */
export declare function notifyDependencyReady(completedSubFeatureId: string, dependencies: Record<string, string[]>, subFeatureStates: Map<string, {
    status: string;
    phase: number;
}>, config?: NotifierConfig): Promise<NotificationResult>;
