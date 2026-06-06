import { PhaseHistory, WorkflowStatus, StateV2_1_0, StateV2_0_0, validateState } from './schema-v2.0.0';
import { DependencyChecker } from './dependency-checker';
import { StateLoader } from './state-loader';
export { DependencyChecker, StateLoader };
export type OldFeatureStateEnum = 'drafting' | 'discovered' | 'specified' | 'planned' | 'tasked' | 'implementing' | 'reviewed' | 'validated' | 'completed';
export type AgentWorkflowStateEnum = 'drafting' | 'discovered' | 'specified' | 'planned' | 'tasked' | 'implementing' | 'reviewed' | 'validated' | 'completed';
interface DistributedFeatureState extends StateV2_1_0 {
    id: string;
    name: string;
}
export type SdduPhase = 1 | 2 | 3 | 4 | 5 | 6;
export type FeatureStateEnum = 'drafting' | 'discovered' | 'specified' | 'planned' | 'tasked' | 'implementing' | 'reviewed' | 'validated' | 'completed';
export interface FeatureState {
    id: string;
    name: string;
    state: FeatureStateEnum;
    createdAt: string;
    updatedAt: string;
    tasks?: any[];
}
export interface TransitionResult {
    allowed: boolean;
    current?: string;
    target?: string;
    reason?: string;
    allowedTargets?: string[];
    missingStages?: {
        state: string;
        name: string;
    }[];
    missingFiles?: string[];
    presentFiles?: string[];
}
export { PhaseHistory, WorkflowStatus, StateV2_0_0, StateV2_1_0, // New export
validateState };
export interface AgentTransitionHook {
    onTransitionStart?(featureId: string, targetState: FeatureStateEnum): void;
    onTransitionComplete?(featureId: string, previousState: FeatureStateEnum, newState: FeatureStateEnum, triggeredBy?: string, comment?: string): void;
    onError?(error: any, featureId?: string, targetState?: string): void;
}
export interface AutoUpdaterIntegration {
    onFileChange?(filePath: string): void;
    onSessionIdle?(): void;
}
export interface HistoryEntry {
    timestamp: string;
    from: FeatureStateEnum;
    to: FeatureStateEnum;
    triggeredBy: string;
    actor?: string;
    comment?: string;
}
export interface FeatureWithFullHistory extends DistributedFeatureState {
    id: string;
    name: string;
    tasks?: any[];
}
export declare class StateMachine {
    private stateLoader;
    private specsDir;
    private dependencyChecker?;
    private agentHook?;
    private validTransitions;
    private requiredFiles;
    constructor(specsDir?: string);
    setAgentHook(hook: AgentTransitionHook): void;
    setDependencyChecker(checker: DependencyChecker): void;
    load(featurePath?: string): Promise<StateV2_1_0>;
    save(): Promise<void>;
    createFeature(name: string, featurePath: string): Promise<FeatureWithFullHistory>;
    getState(featurePath: string): Promise<FeatureWithFullHistory | undefined>;
    isParentFeature(featurePath: string): Promise<boolean>;
    getAllFeatures(): Promise<FeatureWithFullHistory[]>;
    /**
     * 获取特定 feature 当前的相位 (SDD Phase: 1-6)
     */
    getCurrentPhase(featurePath: string): Promise<number>;
    /**
     * 验证状态流转是否合法
     */
    canTransition(featurePath: string, targetState: FeatureStateEnum): Promise<{
        valid: boolean;
        reason?: string;
        current?: FeatureStateEnum;
        target?: FeatureStateEnum;
        allowed?: FeatureStateEnum[];
    }>;
    /**
     * 获取缺失的前置阶段（用于显示跳过阶段的警告）
     */
    getMissingStages(featurePath: string, targetState: FeatureStateEnum): Promise<{
        state: string;
        name: string;
    }[]>;
    /**
     * 检查必需文件是否存在 for parents vs leaves
     */
    checkRequiredFiles(featurePath: string, targetState: FeatureStateEnum, isParent?: boolean): Promise<{
        valid: boolean;
        missing: string[];
        present?: string[];
        reason?: string;
    }>;
    /**
     * 完整的阶段跳转验证（核心方法 - 防跳过提醒关键）
     */
    validateStageTransition(featurePath: string, targetState: FeatureStateEnum): Promise<TransitionResult>;
    /**
     * Updates state (with validation) using distributed storage with hooks and history tracking
     */
    updateState(featurePath: string, newState: FeatureStateEnum, data?: any, triggeredBy?: string, comment?: string, skipValidation?: boolean, isParent?: boolean): Promise<FeatureWithFullHistory>;
    private getStatePhase;
    private mapInternalStateToWorkflowStatus;
    private mapFeatureStateToInternal;
    /**
     * 获取下一步建议
     */
    getNextStep(featurePath: string): Promise<{
        state: string;
        action: string;
    } | null>;
}
