/**
 * Agent 注册表系统
 * 实现 FR-010~021: 动态 Agent 注册机制，解决 T-002 Agent 注册静态化问题
 */
import { AgentMetadata } from '../types';
export interface IAgentRegistry {
    register(agent: AgentMetadata): void;
    registerMany(agents: AgentMetadata[]): void;
    get(agentId: string): AgentMetadata | undefined;
    getAll(): AgentMetadata[];
    getByCategory(category: string): AgentMetadata[];
    has(agentId: string): boolean;
    unregister(agentId: string): boolean;
    clear(): void;
    loadFromDirectory(directory: string): Promise<void>;
    loadFromConfig(configPath: string): Promise<void>;
}
/**
 * Agent 注册表实现类
 * 提供动态 Agent 管理功能
 */
export declare class AgentRegistry implements IAgentRegistry {
    private agents;
    constructor();
    /**
     * 注册单个 Agent
     */
    register(agent: AgentMetadata): void;
    /**
     * 批量注册多个 Agent
     */
    registerMany(agents: AgentMetadata[]): void;
    /**
     * 获取指定的 Agent
     */
    get(agentId: string): AgentMetadata | undefined;
    /**
     * 获取所有 Agents
     */
    getAll(): AgentMetadata[];
    /**
     * 根据类别获取 Agents (基于命名约定)
     */
    getByCategory(category: string): AgentMetadata[];
    /**
     * 检查 Agent 是否已注册
     */
    has(agentId: string): boolean;
    /**
     * 注销指定的 Agent
     */
    unregister(agentId: string): boolean;
    /**
     * 清空所有注册的 Agents
     */
    clear(): void;
    /**
     * 从目录动态加载 Agents 配置
     * 用于实现插件式的 Agent 加载
     */
    loadFromDirectory(directory: string): Promise<void>;
    /**
     * 从配置文件加载 Agents
     */
    loadFromConfig(configPath: string): Promise<void>;
    /**
     * 检查值是否为 AgentMetadata 类型
     */
    private isAgentMetadata;
    /**
     * 检查路径是否存在
     */
    private pathExists;
}
export declare const agentRegistry: AgentRegistry;
export default agentRegistry;
