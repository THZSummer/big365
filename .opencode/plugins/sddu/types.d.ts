import { WorkflowStatus, PhaseHistory, StateV2_0_0, FeatureStateEnum, FeatureState, TransitionResult, AgentTransitionHook, AutoUpdaterIntegration, FeatureWithFullHistory } from './state/machine';
import { StateV2_1_0 } from './state/schema-v2.0.0';
import { FeatureTreeNode, ScanResult } from './state/tree-scanner';
import { ChildFeatureInfo } from './state/schema-v2.0.0';
export type { TreeValidationResult, TreeValidationError, TreeValidationWarning } from './state/tree-state-validator';
export { TreeStateValidator } from './state/tree-state-validator';
export type { WorkflowStatus, PhaseHistory, StateV2_0_0, StateV2_1_0, // New for tree structure
ChildFeatureInfo, // New for tree structure (moved from correct import)
FeatureTreeNode, // New for tree structure
ScanResult, // New for tree structure
FeatureStateEnum, FeatureState, TransitionResult, AgentTransitionHook, AutoUpdaterIntegration, FeatureWithFullHistory, };
export { validateState } from './state/machine';
export type { DiscoveryStep, DiscoveryContext, DiscoveryProgress, DiscoveryResult, CoachingConfig, // 添加缺失的CoachongConfig
StepExecutionResult, } from './discovery/types';
export { CoachingLevel } from './discovery/types';
export type { AgentIntegrationResult, } from './agents/sddu-agents';
export type { ParsedTask, ParallelGroup, ExecutionWave, } from './utils/tasks-parser';
export { parseTasksMarkdown, parseParallelGroups, computeExecutionOrder, detectTaskCircularDependency, getReadyTasks, getIncompleteTasks, areDependenciesSatisfied, parseTask, } from './utils/tasks-parser';
export type { SubFeatureMeta, } from './utils/subfeature-manager';
export { detectFeatureMode, createSubFeature, generateSubFeatureIndex, scanSubFeatures, validateSubFeatureCompleteness, } from './utils/subfeature-manager';
/**
 * Agent 元数据接口，用于动态 Agent 注册
 * 解决 T-002 Agent 注册静态化问题
 */
export interface AgentMetadata {
    name: string;
    description: string;
    mode: string;
    promptFile: string;
}
/**
 * SDDU 配置选项接口
 * 统一配置接口，便于扩展
 */
export interface SdduConfig {
    autoUpdateState?: boolean;
    enableDiscovery?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    defaultTimeout?: number;
    maxRetries?: number;
    enableTreeStructure?: boolean;
    maxTreeDepth?: number;
}
export type { HistoryEntry } from './state/machine';
declare const _default: {};
export default _default;
