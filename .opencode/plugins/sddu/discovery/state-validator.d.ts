/**
 * Discovery 状态验证器
 * 用于验证从 drafting 到 discovered 的状态流转
 */
import { StateMachine } from '../state/machine';
interface DiscoveryTransitionResult {
    canTransition: boolean;
    reason: string;
    warning?: string;
    discoveryExists: boolean;
}
export declare class DiscoveryStateValidator {
    private stateMachine;
    constructor(stateMachine: StateMachine);
    /**
     * 检查是否可以从 drafting 转移到 discovered 状态
     * - discovery.md 文件是否存在
     * - discovery.md 内容基本结构是否完整
     */
    canTransitionToDiscovered(featureId: string): Promise<DiscoveryTransitionResult>;
    private mapWorkflowStatusToStateEnum;
    /**
     * 检查是否可以从 discovered 转移到 specified 状态
     * 这是为了确保 discovery 阶段已经完成后再进行 spec 预写
     */
    canTransitionFromDiscoveredToSpecified(featureId: string): Promise<{
        canTransition: boolean;
        reason: string;
        discovered: boolean;
    }>;
    /**
     * 检查用户是否在当前会话中跳过了 discovery 阶段
     * 这是一种跳过 discovery 的情况，应发出警告
     */
    checkSkippedDiscovery(featureId: string): Promise<boolean>;
}
export {};
