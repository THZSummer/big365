import { FeatureStatus } from './schema-v1.2.5';
export interface SubFeatureState {
    id: string;
    status: FeatureStatus;
    phase: number;
    assignee?: string;
}
export interface DependencyGraph {
    dependencies: Record<string, string[]>;
    blockedBy: Record<string, string[]>;
}
/**
 * 聚合子 Feature 状态计算 Feature 整体状态
 * 规则：Feature 状态 = 最慢子 Feature 的状态
 */
export declare function aggregateFeatureState(subFeatures: SubFeatureState[]): FeatureStatus;
/**
 * 构建依赖关系图，包含直接依赖和被阻塞关系
 */
export declare function buildDependencyGraph(subFeatures: SubFeatureState[], dependencies: Record<string, string[]>): DependencyGraph;
/**
 * 循环依赖检测 (DFS)
 */
export declare function detectCircularDependency(subFeatureId: string, dependencies: Record<string, string[]>, visited?: Set<string>, path?: string[]): string[] | null;
/**
 * 检查子 Feature 是否其依赖已完成（至少是 planned 状态）
 */
export declare function isDependencyReady(subFeatureId: string, dependencyGraph: DependencyGraph, subFeatureStates: Map<string, SubFeatureState>): boolean;
/**
 * 获取所有可并行执行的子 Feature 列表（依赖已就绪且不在阻塞中的）
 */
export declare function getReadySubFeatures(dependencyGraph: DependencyGraph, subFeatureStates: Map<string, SubFeatureState>): string[];
