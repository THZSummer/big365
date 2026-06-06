import { StateMachine } from './machine';
import { FeatureStateEnum } from './machine';
/**
 * 自动状态更新器
 * 监听文件变化并自动更新 Feature 状态
 */
export declare class AutoUpdater {
    private stateMachine;
    private debounceTimer;
    private readonly debounceDelay;
    private enabled;
    private specsDir;
    private readonly keyFiles;
    constructor(stateMachine: StateMachine);
    /**
     * 启用/禁用自动更新器
     */
    setEnabled(enabled: boolean): void;
    /**
     * 启用防抖以避免频繁更新
     */
    private debouncedUpdate;
    /**
     * 扫描并自动更新相关的 Feature 状态 - 支持嵌套路径
     */
    scanAndAutoUpdate(targetPath?: string): Promise<void>;
    /**
     * 使用 TreeScanner 来获取所有 Feature 路径列表 - 支持嵌套结构
     */
    getAllFeatureIds(): Promise<string[]>;
    /**
     * 推断给定 Feature 目录中的最新状态
     */
    inferCurrentStateFromFiles(featurePath: string): Promise<FeatureStateEnum | null>;
    /**
     * 检查 Feature 目录下是否有任何相关文件
     */
    private isFeatureDirectory;
    /**
     * 检查给定目录中缺失的文件
     */
    private checkMissingFiles;
    /**
     * 为文件变化更新单个 Feature 的状态
     */
    private updateFeatureStatusForFileChanges;
    /**
     * Maps the Status to State for comparison purposes
     */
    private mapStatusToState;
    /**
     * Checks if state requires advanced handling (not allowed for parent features)
     */
    private stateRequiresAdvancedHandling;
    /**
     * 判断是否应该执行状态更新
     *
     * 仅当日志化状态从早期阶段到晚期阶段时，或者状态真正发生变化但仍在合理范围内时生效
     */
    private shouldUpdateState;
    /**
     * 监听指定目录的文件变更事件
     * 在实际环境中，这个方法会被 VSCode 文件更改事件驱动
     */
    listenForChanges(dirPath?: string): void;
    /**
     * 触发自动更新检查（供外部事件处理器使用）
     */
    triggerAutoUpdate(targetPath?: string): void;
    /**
     * 清理资源：取消所有待处理的定时器
     */
    dispose(): void;
}
