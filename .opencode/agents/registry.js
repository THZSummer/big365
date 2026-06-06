/**
 * Agent 注册表系统
 * 实现 FR-010~021: 动态 Agent 注册机制，解决 T-002 Agent 注册静态化问题
 */
import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * Agent 注册表实现类
 * 提供动态 Agent 管理功能
 */
export class AgentRegistry {
    agents;
    constructor() {
        this.agents = new Map();
    }
    /**
     * 注册单个 Agent
     */
    register(agent) {
        this.agents.set(agent.name.toLowerCase(), agent);
    }
    /**
     * 批量注册多个 Agent
     */
    registerMany(agents) {
        agents.forEach(agent => this.register(agent));
    }
    /**
     * 获取指定的 Agent
     */
    get(agentId) {
        return this.agents.get(agentId.toLowerCase());
    }
    /**
     * 获取所有 Agents
     */
    getAll() {
        return Array.from(this.agents.values());
    }
    /**
     * 根据类别获取 Agents (基于命名约定)
     */
    getByCategory(category) {
        const categoryLower = category.toLowerCase();
        return Array.from(this.agents.values()).filter(agent => agent.name.toLowerCase().includes(categoryLower) ||
            agent.description.toLowerCase().includes(categoryLower));
    }
    /**
     * 检查 Agent 是否已注册
     */
    has(agentId) {
        return this.agents.has(agentId.toLowerCase());
    }
    /**
     * 注销指定的 Agent
     */
    unregister(agentId) {
        return this.agents.delete(agentId.toLowerCase());
    }
    /**
     * 清空所有注册的 Agents
     */
    clear() {
        this.agents.clear();
    }
    /**
     * 从目录动态加载 Agents 配置
     * 用于实现插件式的 Agent 加载
     */
    async loadFromDirectory(directory) {
        try {
            const dirExists = await this.pathExists(directory);
            if (!dirExists) {
                console.warn(`Agent directory not found: ${directory}`);
                return;
            }
            // 查找所有 .json 或 .js 配置文件，通常存放 Agent 配置
            const configFiles = await fs.readdir(directory);
            const jsonConfigs = configFiles.filter(file => file.endsWith('.json') && !file.startsWith('.'));
            for (const configFile of jsonConfigs) {
                const configPath = path.join(directory, configFile);
                try {
                    const configContent = await fs.readFile(configPath, 'utf-8');
                    const config = JSON.parse(configContent);
                    // 判断是单一还是多个 Agents
                    if (Array.isArray(config)) {
                        this.registerMany(config);
                    }
                    else if (config.agents && Array.isArray(config.agents)) {
                        this.registerMany(config.agents);
                    }
                    console.debug(`Loaded agents from config: ${configFile}`);
                }
                catch (err) {
                    console.error(`Failed to load agent config from ${configFile}: ${err}`);
                }
            }
            // 支持从 JavaScript 文件加载
            const jsFiles = configFiles.filter(file => (file.endsWith('.js') || file.endsWith('.cjs')) && !file.startsWith('.'));
            for (const jsFile of jsFiles) {
                const modulePath = path.resolve(directory, jsFile);
                try {
                    // 使用 dynamic import 来加载 JavaScript 模块
                    const module = await import(modulePath);
                    // 尝试不同的导出形式: 命名为 agents, 默认导出为数组, 单个对象等
                    let agentsToRegister = [];
                    if (module.agents && Array.isArray(module.agents)) {
                        agentsToRegister = module.agents;
                    }
                    else if (module.default && Array.isArray(module.default)) {
                        agentsToRegister = module.default;
                    }
                    else if (module.default && this.isAgentMetadata(module.default)) {
                        agentsToRegister = [module.default];
                    }
                    else if (this.isAgentMetadata(module)) {
                        agentsToRegister = [module];
                    }
                    if (agentsToRegister.length > 0) {
                        this.registerMany(agentsToRegister);
                        console.debug(`Loaded agents from module: ${jsFile}`);
                    }
                }
                catch (err) {
                    console.error(`Failed to load agents from ${jsFile}: ${err}`);
                }
            }
            // 扩展以支持 .md 文件类型的 Agent，这样可以从 templates/agents/ 目录加载
            const agentFiles = configFiles.filter(file => file.endsWith('.md') && file.startsWith('sddu-'));
            for (const agentFile of agentFiles) {
                try {
                    const agentName = path.basename(agentFile, '.md');
                    const agentDescription = `${agentName} Agent loaded from templates/agents/`;
                    const agentMetadata = {
                        name: agentName,
                        description: agentDescription,
                        mode: 'subagent',
                        promptFile: path.join(directory, agentFile) // 使用完整路径
                    };
                    // 避免重复注册相同名称的 agent
                    if (!this.has(agentName)) {
                        this.register(agentMetadata);
                        console.debug(`Added MD agent: ${agentName} from ${agentFile}`);
                    }
                }
                catch (err) {
                    console.error(`Failed to load agent from ${agentFile}: ${err}`);
                }
            }
        }
        catch (err) {
            console.error(`Error loading Agents from directory ${directory}:`, err);
            throw err;
        }
    }
    /**
     * 从配置文件加载 Agents
     */
    async loadFromConfig(configPath) {
        try {
            const configExists = await this.pathExists(configPath);
            if (!configExists) {
                console.warn(`Agent config file not found: ${configPath}`);
                return;
            }
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            if (config.agents && Array.isArray(config.agents)) {
                this.registerMany(config.agents);
            }
            console.log(`Successfully loaded agents from config: ${configPath}`);
        }
        catch (err) {
            console.error(`Failed to load agents from config file ${configPath}:`, err);
            throw err;
        }
    }
    /**
     * 检查值是否为 AgentMetadata 类型
     */
    isAgentMetadata(value) {
        return (value &&
            typeof value === 'object' &&
            typeof value.name === 'string' &&
            typeof value.description === 'string' &&
            typeof value.mode === 'string' &&
            typeof value.promptFile === 'string');
    }
    /**
     * 检查路径是否存在
     */
    async pathExists(filepath) {
        try {
            await fs.access(filepath);
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
// 导出单例实例
export const agentRegistry = new AgentRegistry();
export default agentRegistry;
