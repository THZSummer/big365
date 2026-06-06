import { StateMachine, FeatureStateEnum } from './machine';
/**
 * 依赖检查结果
 */
export interface DependencyCheckResult {
    allowed: boolean;
    reason?: string;
    blockingFeatures?: Array<{
        featureId: string;
        featureName: string;
        currentState: FeatureStateEnum;
        requiredState: FeatureStateEnum;
    }>;
    warnings?: string[];
}
/**
 * Feature 状态信息
 */
export interface FeatureStateInfo {
    featureId: string;
    featureName: string;
    featurePath: string;
    state: FeatureStateEnum;
    dependencies: string[];
}
/**
 * 依赖状态检查器
 *
 * 支持跨子树依赖解析，处理嵌套特征的依赖关系
 *
 * 检查规则:
 * - 状态前进时：检查所有依赖 Feature 的状态 ≥ 当前状态
 * - 状态回退时：警告检查被依赖 Feature 的状态
 */
export declare class DependencyChecker {
    private stateMachine;
    private specsDir;
    private cache;
    private cacheExpiry;
    private lastCacheUpdate;
    constructor(stateMachine: StateMachine, specsDir?: string);
    /**
     * 清除缓存
     */
    clearCache(): void;
    /**
     * 使用 TreeScanner 扫描所有 Features 状态并构建依赖图，支持嵌套结构
     */
    scanAllFeatures(): Promise<Map<string, FeatureStateInfo>>;
    /**
     * 检查 Feature 状态前进的依赖 - 支持跨子树依赖
     *
     * 规则: 所有依赖 Feature 的状态必须 ≥ 当前状态
     */
    checkDependenciesForStateChange(featurePath: string, // Full path to the feature in the tree
    targetState: FeatureStateEnum): Promise<DependencyCheckResult>;
    /**
     * Attempt to find the dependency in the tree structure based on partial identifiers
     */
    private tryMatchDepInTree;
    /**
     * Check if two paths share same parent directory
     */
    private isSameParentDirectory;
    /**
     * Resolve dependency path in relation to current feature (for cross-tree references)
     */
    private resolveDependencyPath;
    /**
     * 检查状态回退的警告 - 考虑交叉树依赖
     */
    checkStateRollbackWarnings(featurePath: string, fromState: FeatureStateEnum, toState: FeatureStateEnum): Promise<string[]>;
    /**
     * 检测循环依赖，覆盖嵌套结构
     */
    detectCircularDependencies(): Promise<Array<string[]>>;
    /**
     * 获取阻塞当前 Feature 的列表
     */
    getBlockingFeatures(featurePath: string): Promise<Array<{
        featureId: string;
        featureName: string;
        state: FeatureStateEnum;
    }>>;
    /**
     * 获取被当前 Feature 阻塞的列表
     */
    getBlockedByFeatures(featurePath: string): Promise<Array<{
        featureId: string;
        featureName: string;
        state: FeatureStateEnum;
    }>>;
    /**
     * Map feature status to enum
     */
    private mapStatusToState;
    /**
     * 辅助函数：检查状态是否就绪（≥ 目标状态）
     */
    private isStateReady;
    /**
     * 辅助函数：检查状态是否更高
     */
    private isStateHigher;
    /**
     * 获取依赖关系可视化数据
     */
    getDependencyVisualization(): Promise<{
        nodes: Array<{
            id: string;
            label: string;
            state: FeatureStateEnum;
        }>;
        edges: Array<{
            from: string;
            to: string;
        }>;
    }>;
}
