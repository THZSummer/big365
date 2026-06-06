/**
 * agents/registry.ts 单元测试
 * 测试 Agent 注册表系统
 */
import { AgentRegistry, agentRegistry, } from './registry';
describe('AgentRegistry 测试', () => {
    let registry;
    beforeEach(() => {
        // 每个测试前重置 registry
        registry = new AgentRegistry();
    });
    test('初始化 AgentRegistry', () => {
        expect(registry).toBeDefined();
        expect(registry).toBeInstanceOf(AgentRegistry);
        expect(registry.getAll().length).toBe(0);
    });
    test('单个 Agent 注册与获取', () => {
        const agent = {
            name: 'test-agent',
            description: 'Test agent description',
            mode: 'subagent',
            promptFile: 'path/to/test-agent.md'
        };
        registry.register(agent);
        expect(registry.has('test-agent')).toBe(true);
        expect(registry.has('TEST-AGENT')).toBe(true); // 测试大小写不敏感
        expect(registry.has('non-existent')).toBe(false);
        const retrieved = registry.get('test-agent');
        expect(retrieved).toEqual(agent);
        const retrievedCaseInsensitive = registry.get('TEST-AGENT');
        expect(retrievedCaseInsensitive).toEqual(agent);
        const nonExistent = registry.get('non-existent');
        expect(nonExistent).toBeUndefined();
    });
    test('批量注册', () => {
        const agents = [
            {
                name: 'agent-1',
                description: 'First agent',
                mode: 'subagent',
                promptFile: 'path/agent1.md'
            },
            {
                name: 'agent-2',
                description: 'Second agent',
                mode: 'subagent',
                promptFile: 'path/agent2.md'
            },
            {
                name: 'agent-3',
                description: 'Third agent',
                mode: 'subagent',
                promptFile: 'path/agent3.md'
            }
        ];
        registry.registerMany(agents);
        expect(registry.getAll().length).toBe(3);
        expect(registry.has('agent-1')).toBe(true);
        expect(registry.has('agent-2')).toBe(true);
        expect(registry.has('agent-3')).toBe(true);
        expect(registry.get('agent-1')?.description).toBe('First agent');
        expect(registry.get('agent-2')?.description).toBe('Second agent');
        expect(registry.get('agent-3')?.description).toBe('Third agent');
    });
    test('按类别获取 Agents', () => {
        const agents = [
            {
                name: 'sddu-api-agent',
                description: 'API related agent',
                mode: 'subagent',
                promptFile: 'api-agent.md'
            },
            {
                name: 'sddu-db-agent',
                description: 'Database related agent',
                mode: 'subagent',
                promptFile: 'db-agent.md'
            },
            {
                name: 'other-agent',
                description: 'Non-SDD related agent',
                mode: 'subagent',
                promptFile: 'other-agent.md'
            }
        ];
        registry.registerMany(agents);
        // 通过名称查找
        const sddAgents = registry.getByCategory('sdd');
        expect(sddAgents.length).toBe(2);
        expect(sddAgents.some(a => a.name === 'sddu-api-agent')).toBe(true);
        expect(sddAgents.some(a => a.name === 'sddu-db-agent')).toBe(true);
        expect(sddAgents.some(a => a.name === 'other-agent')).toBe(false);
        // 通过描述查找
        const apiRelated = registry.getByCategory('API');
        expect(apiRelated.length).toBe(1);
        expect(apiRelated[0].name).toBe('sddu-api-agent');
    });
    test('注销 Agent', () => {
        const agent = {
            name: 'removable-agent',
            description: 'Removable agent',
            mode: 'subagent',
            promptFile: 'removable-agent.md'
        };
        registry.register(agent);
        expect(registry.has('removable-agent')).toBe(true);
        const removed = registry.unregister('removable-agent');
        expect(removed).toBe(true);
        expect(registry.has('removable-agent')).toBe(false);
        expect(registry.get('removable-agent')).toBeUndefined();
        // 尝试删除不存在的 agent
        const notRemoved = registry.unregister('non-existent');
        expect(notRemoved).toBe(false);
    });
    test('清空所有 Agents', () => {
        const agents = [
            { name: 'a', description: 'desc', mode: 'm', promptFile: 'pf' },
            { name: 'b', description: 'desc', mode: 'm', promptFile: 'pf' },
            { name: 'c', description: 'desc', mode: 'm', promptFile: 'pf' }
        ];
        registry.registerMany(agents);
        expect(registry.getAll().length).toBe(3);
        registry.clear();
        expect(registry.getAll().length).toBe(0);
        expect(registry.has('a')).toBe(false);
        expect(registry.has('b')).toBe(false);
        expect(registry.has('c')).toBe(false);
    });
    test('获取所有 Agents', () => {
        const testAgents = [
            { name: 'agent-x', description: 'desc x', mode: 'm', promptFile: 'pf' },
            { name: 'agent-y', description: 'desc y', mode: 'm', promptFile: 'pf' },
            { name: 'agent-z', description: 'desc z', mode: 'm', promptFile: 'pf' }
        ];
        registry.registerMany(testAgents);
        const allAgents = registry.getAll();
        expect(allAgents.length).toBe(3);
        expect(allAgents.some(agent => agent.name === 'agent-x')).toBe(true);
        expect(allAgents.some(agent => agent.name === 'agent-y')).toBe(true);
        expect(allAgents.some(agent => agent.name === 'agent-z')).toBe(true);
    });
    test('验证全局单例实例', () => {
        expect(agentRegistry).toBeDefined();
        expect(agentRegistry).toBeInstanceOf(AgentRegistry);
        // 注意：此处不再直接访问私有的单例实例，而是检查其功能即可
        // 全局实例也是 IAgentRegistry 接口的实现
        expect(typeof agentRegistry.register).toBe('function');
        expect(typeof agentRegistry.get).toBe('function');
        expect(typeof agentRegistry.has).toBe('function');
    });
    test('覆盖已存在的 Agent', () => {
        const initialAgent = {
            name: 'duplicate-test',
            description: 'Initial agent',
            mode: 'subagent',
            promptFile: 'initial-agent.md'
        };
        const updatedAgent = {
            name: 'duplicate-test',
            description: 'Updated agent',
            mode: 'chatbot',
            promptFile: 'updated-agent.md'
        };
        registry.register(initialAgent);
        expect(registry.get('duplicate-test')?.description).toBe('Initial agent');
        registry.register(updatedAgent);
        expect(registry.get('duplicate-test')?.description).toBe('Updated agent');
        expect(registry.get('duplicate-test')?.mode).toBe('chatbot');
    });
    test('大小写不敏感的匹配', () => {
        const agent = {
            name: 'CaSe-SeNsItIvE-Agent',
            description: 'Testing case insensitivity',
            mode: 'subagent',
            promptFile: 'case-agent.md'
        };
        registry.register(agent);
        expect(registry.has('CaSe-SeNsItIvE-Agent')).toBe(true);
        expect(registry.has('case-sensitive-agent')).toBe(true);
        expect(registry.has('CASE-SENSITIVE-AGENT')).toBe(true);
        expect(registry.has('CaSE-sEnSiTiVe-aGeNT')).toBe(true);
        expect(registry.get('CaSe-SeNsItIvE-Agent')).toEqual(agent);
        expect(registry.get('case-sensitive-agent')).toEqual(agent);
        expect(registry.get('CASE-SENSITIVE-AGENT')).toEqual(agent);
        expect(registry.get('CaSE-sEnSiTiVe-aGeNT')).toEqual(agent);
    });
});
// 为了测试全局单例实例
const globalAgentRegistryInstance = agentRegistry;
// 接口实现验证函数（不会执行，只是验证类型）
function verifyInterfaceImplementation() {
    return new AgentRegistry();
}
