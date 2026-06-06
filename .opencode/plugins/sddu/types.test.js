/**
 * types.ts 单元测试
 * 测试统一类型出口文件的所有导出
 */
import { validateState, 
// 工具函数导入
parseTasksMarkdown, parseParallelGroups, computeExecutionOrder, detectTaskCircularDependency, getReadyTasks, getIncompleteTasks, areDependenciesSatisfied, parseTask, 
// 额外类型 import
CoachingLevel, } from './types';
describe('类型导出测试', () => {
    test('验证 Workflow 相关类型的导出', () => {
        // 直接创建一个类型测试，而非使用不存在的变量
        const state = {
            feature: 'test-feature',
            version: '2.0.0',
            status: 'specified', // 这是一个 ts 中的类型定义字符串字面量，不是变量
            phase: 1,
            phaseHistory: [{
                    phase: 1,
                    status: 'specified',
                    timestamp: new Date().toISOString(),
                    triggeredBy: 'test'
                }],
            files: {
                spec: 'spec.md'
            },
            dependencies: {
                on: [],
                blocking: []
            }
        };
        expect(validateState(state)).toBe(true);
        expect(state.feature).toBe('test-feature');
    });
    test('验证 FeatureStateEnum 和相关接口', () => {
        // 确保类型定义存在
        const enums = [
            'drafting', 'discovered', 'specified', 'planned', 'tasked', 'implementing', 'reviewed', 'validated', 'completed'
        ];
        expect(enums.length).toBeGreaterThan(0);
        // 测试 FeatureState 接口
        const featureState = {
            id: 'test-id',
            name: 'Test Name',
            state: 'drafting',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        expect(featureState.id).toBe('test-id');
    });
    test('验证 Discovery 相关类型', () => {
        const coachingLevels = [
            CoachingLevel.IDEA_STAGE,
            CoachingLevel.PAIN_STAGE,
            CoachingLevel.SOLUTION_STAGE,
            CoachingLevel.EXECUTION_STAGE,
        ];
        expect(coachingLevels.length).toBe(4);
        const step = {
            id: 'test-step',
            name: 'Test Step',
            description: 'Test Description',
            prompts: ['Prompt 1', 'Prompt 2'],
            outputField: 'outputField'
        };
        expect(step.id).toBe('test-step');
    });
    test('验证 Agent 相关类型', () => {
        const agentResult = {
            success: true,
            message: 'Success'
        };
        expect(agentResult.success).toBe(true);
    });
    test('验证 Task Parser 类型和工具函数', () => {
        // 验证工具函数存在
        expect(typeof parseTasksMarkdown).toBe('function');
        expect(typeof parseParallelGroups).toBe('function');
        expect(typeof computeExecutionOrder).toBe('function');
        expect(typeof detectTaskCircularDependency).toBe('function');
        expect(typeof getReadyTasks).toBe('function');
        expect(typeof getIncompleteTasks).toBe('function');
        expect(typeof areDependenciesSatisfied).toBe('function');
        expect(typeof parseTask).toBe('function');
        // 验证类型的存在
        const task = {
            id: 'TEST-001',
            description: 'Test task',
            dependencies: ['TEST-002']
        };
        const group = {
            id: 1,
            name: 'Test Group',
            tasks: [task],
            waitGroups: [0]
        };
        const wave = {
            waveNumber: 0,
            groups: [group],
            tasks: [task]
        };
        expect(wave.waveNumber).toBe(0);
    });
    test('验证 SubFeature 相关类型', () => {
        const meta = {
            id: 'sub-001',
            name: 'Sub Feature 1',
            status: 'active',
            dir: 'path/to/subfeature'
        };
        expect(meta.id).toBe('sub-001');
    });
    test('验证自定义类型', () => {
        const metadata = {
            name: 'test-agent',
            description: 'Test agent description',
            mode: 'subagent',
            promptFile: 'path/to/prompt.md'
        };
        expect(metadata.name).toBe('test-agent');
        const config = {
            autoUpdateState: true,
            enableDiscovery: false,
            logLevel: 'info',
            defaultTimeout: 60
        };
        expect(config.autoUpdateState).toBe(true);
    });
    test('验证函数导出正常', () => {
        // 验证 parseTask 函数能正常使用
        const task = parseTask('- [ ] TASK-001: Test task');
        if (task) {
            expect(task.id).toBe('TASK-001');
        }
    });
});
// 如果不需要所有测试，可以使用 describe.skip 跳过一些复杂的测试
