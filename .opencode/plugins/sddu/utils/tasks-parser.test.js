import { parseTasksMarkdown, parseParallelGroups, parseTask, computeExecutionOrder, detectTaskCircularDependency, getReadyTasks } from './tasks-parser';
describe('tasks-parser', () => {
    describe('parseTask', () => {
        it('应该能够解析带描述的任务', () => {
            const task = parseTask('- [ ] TASK-001: 实现功能A (2h)', 1);
            expect(task).toEqual({
                id: 'TASK-001',
                description: '实现功能A (2h)',
                dependencies: [],
                group: 1
            });
        });
        it('应该能够正确提取依赖项', () => {
            const task = parseTask('- [ ] TASK-002: 实现功能B，依赖 TASK-001', 0);
            expect(task?.dependencies).toContain('TASK-001');
        });
        it('应该忽略非任务格式的行', () => {
            const task = parseTask('这只是一个普通文本行');
            expect(task).toBeNull();
        });
    });
    describe('parseTasksMarkdown', () => {
        it('应该能够解析完整的tasks.md文档', () => {
            const markdownContent = `
# 任务分解示例

### 组 0: 基础设施
- [ ] TASK-001: 实现功能A (2h)
- [ ] TASK-002: 实现功能B (3h)

### 组 1: 核心功能 (等待组 0)
- [ ] TASK-003: 实现核心模块，依赖TASK-001 (4h)
- [ ] TASK-004: 实现辅助模块 (2h)

### 组 2: 集成测试 (等待组 1)
- [ ] TASK-005: 集成测试，依赖 TASK-003 (3h)
`;
            const result = parseTasksMarkdown(markdownContent);
            expect(result.groups).toHaveLength(3);
            expect(result.tasks).toHaveLength(5);
            // 检查TASK-005的依赖
            const task5 = result.tasks.find(t => t.id === 'TASK-005');
            expect(task5?.dependencies).toContain('TASK-003');
        });
        it('应该能够处理没有明确指定组的情况', () => {
            const markdownContent = `
# 单一组任务分解

- [ ] TASK-001: 实现功能A (2h)
- [ ] TASK-002: 实现功能B (3h)
- [ ] TASK-003: 实现功能C (4h)
`;
            const result = parseTasksMarkdown(markdownContent);
            // 应该被视为一个默认组
            expect(result.groups).toHaveLength(1);
            expect(result.groups[0].name).toBe('默认组');
            expect(result.groups[0].id).toBe(0);
            expect(result.tasks).toHaveLength(3);
        });
    });
    describe('parseParallelGroups', () => {
        it('应该能够正确解析并行组', () => {
            const markdownContent = `
### 组 0: 基础设施
- [ ] TASK-000: 初始化框架 (0h)
- [ ] TASK-001: 用户模型实现 (2h)

### 组 1: 业务逻辑 (等待组 0)
- [ ] TASK-002: 用户注册逻辑 (3h)
- [ ] TASK-003: 用户登录逻辑 (2h)

### 组 2: 验证 (等待组 1)
- [ ] TASK-004: 用户注册测试 (2h)
- [ ] TASK-005: 集成测试 (3h)
`;
            const groups = parseParallelGroups(markdownContent);
            expect(groups).toHaveLength(3);
            expect(groups[0]).toEqual({
                id: 0,
                name: '基础设施',
                tasks: expect.any(Array),
                waitGroups: undefined
            });
            expect(groups[1]).toEqual({
                id: 1,
                name: '业务逻辑',
                tasks: expect.any(Array),
                waitGroups: [0]
            });
            expect(groups[2]).toEqual({
                id: 2,
                name: '验证',
                tasks: expect.any(Array),
                waitGroups: [1]
            });
        });
        it('should extract group dependencies correctly', () => {
            const content = `### 组 3: 集成部署 (等待组 2)
- [ ] TASK-101: 部署脚本编写 (2h)
- [ ] TASK-102: CI/CD 配置 (3h)`;
            const groups = parseParallelGroups(content);
            expect(groups.length).toBe(1);
            expect(groups[0].waitGroups).toEqual([2]);
        });
    });
    describe('computeExecutionOrder', () => {
        it('should correctly calculate execution waves based on group dependencies', () => {
            const groups = [
                {
                    id: 0,
                    name: '基础设施',
                    tasks: [{ id: 'TASK-001', description: '基础设置', dependencies: [] }],
                    waitGroups: undefined
                },
                {
                    id: 1,
                    name: '核心逻辑',
                    tasks: [{ id: 'TASK-002', description: '主要功能', dependencies: [] }],
                    waitGroups: [0]
                },
                {
                    id: 2,
                    name: '测试',
                    tasks: [{ id: 'TASK-003', description: '测试代码', dependencies: [] }],
                    waitGroups: [1]
                }
            ];
            const executionOrder = computeExecutionOrder(groups);
            expect(executionOrder).toHaveLength(3); // 按依赖顺序应有3个波次
            expect(executionOrder[0].waveNumber).toBe(0);
            expect(executionOrder[0].groups).toHaveLength(1); // 第一波执行组0
            expect(executionOrder[0].groups[0].id).toBe(0);
            expect(executionOrder[1].groups[0].id).toBe(1);
            expect(executionOrder[2].groups[0].id).toBe(2);
        });
        it('should handle parallel groups (groups without mutual dependencies)', () => {
            const groups = [
                {
                    id: 0,
                    name: '组A',
                    tasks: [{ id: 'TASK-A1', description: 'A1', dependencies: [] }],
                    waitGroups: undefined
                },
                {
                    id: 1,
                    name: '组B',
                    tasks: [{ id: 'TASK-B1', description: 'B1', dependencies: [] }],
                    waitGroups: undefined
                },
                {
                    id: 2,
                    name: '组C',
                    tasks: [{ id: 'TASK-C1', description: 'C1', dependencies: [] }],
                    waitGroups: [0, 1] // 等待A和B
                }
            ];
            const executionOrder = computeExecutionOrder(groups);
            // 前两组应在同一波次并行执行，第3组单独一个波次
            expect(executionOrder).toHaveLength(2);
            expect(executionOrder[0].groups).toHaveLength(2); // 波次0并行执行A和B
            expect(executionOrder[1].groups).toHaveLength(1); // 波次1执行C
        });
        it('should throw an error when there is a circular dependency', () => {
            const groups = [
                {
                    id: 0,
                    name: '组A',
                    tasks: [],
                    waitGroups: [1] // A等待B
                },
                {
                    id: 1,
                    name: '组B',
                    tasks: [],
                    waitGroups: [0] // B等待A -> 循环依赖
                }
            ];
            expect(() => computeExecutionOrder(groups)).toThrow('检测到组依赖循环或无效依赖');
        });
    });
    describe('detectTaskCircularDependency', () => {
        it('should detect simple direct circular dependency', () => {
            const tasks = [
                { id: 'TASK-001', description: '任务1', dependencies: ['TASK-002'] },
                { id: 'TASK-002', description: '任务2', dependencies: ['TASK-001'] } // 循环依赖
            ];
            const cycle = detectTaskCircularDependency(tasks);
            expect(cycle).not.toBeNull();
            expect(cycle).toContain('TASK-001');
            expect(cycle).toContain('TASK-002');
        });
        it('should detect long chains circular dependency', () => {
            // A -> B -> C -> A
            const tasks = [
                { id: 'TASK-A', description: '任务A', dependencies: ['TASK-B'] },
                { id: 'TASK-B', description: '任务B', dependencies: ['TASK-C'] },
                { id: 'TASK-C', description: '任务C', dependencies: ['TASK-A'] }
            ];
            const cycle = detectTaskCircularDependency(tasks);
            expect(cycle).not.toBeNull();
            expect(cycle.length).toBe(4); // 应该是 TASK-A -> TASK-B -> TASK-C -> TASK-A
        });
        it('should return null for normal dependencies without cycles', () => {
            const tasks = [
                { id: 'TASK-001', description: '任务1', dependencies: [] },
                { id: 'TASK-002', description: '任务2', dependencies: ['TASK-001'] }, // 正常依赖
            ];
            const cycle = detectTaskCircularDependency(tasks);
            expect(cycle).toBeNull();
        });
        it('should detect cycle in complex dependency graph', () => {
            /*
            A -> B -> D
            C -> A -> D (A间接依赖自己，形成循环)
            */
            const tasks = [
                { id: 'TASK-A', description: '任务A', dependencies: ['TASK-B', 'TASK-X'] },
                { id: 'TASK-X', description: '任务X', dependencies: ['TASK-A'] }, // 循环在这里
                { id: 'TASK-D', description: '任务D', dependencies: ['TASK-A'] }
            ];
            const cycle = detectTaskCircularDependency(tasks);
            expect(cycle).not.toBeNull();
            expect(cycle).toContain('TASK-A');
            expect(cycle).toContain('TASK-X');
        });
    });
    describe('getReadyTasks', () => {
        it('should return only tasks whose dependencies are all satisfied', () => {
            const tasks = [
                { id: 'TASK-001', description: '任务1', dependencies: [] }, // 准备好
                { id: 'TASK-002', description: '任务2', dependencies: ['TASK-001'] }, // 依赖任务1
                { id: 'TASK-003', description: '任务3', dependencies: [] }, // 准备好
                { id: 'TASK-004', description: '任务4', dependencies: ['TASK-005'] } // 依赖任务5
            ];
            const completedTasks = new Set(['TASK-001', 'TASK-005']);
            const readyTasks = getReadyTasks(tasks, completedTasks);
            expect(readyTasks).toHaveLength(3); // 应该是3个任务: TASK-002(TASK-001已完成), TASK-003(无依赖), TASK-004(TASK-005已完成)
            const readyIds = readyTasks.map(t => t.id);
            expect(readyIds).toContain('TASK-002'); // TASK-001已完成，所以TASK-002准备好
            expect(readyIds).toContain('TASK-003'); // 没有依赖，满足条件
            expect(readyIds).toContain('TASK-004'); // TASK-005已完成，所以TASK-004准备好
            expect(readyIds).not.toContain('TASK-001'); // 已完成的任务不应再次被返回
        });
        it('should exclude tasks that are already completed', () => {
            const tasks = [
                { id: 'TASK-001', description: '任务1', dependencies: [] },
                { id: 'TASK-002', description: '任务2', dependencies: [] }
            ];
            const completedTasks = new Set(['TASK-001']);
            const readyTasks = getReadyTasks(tasks, completedTasks);
            const readyIds = readyTasks.map(t => t.id);
            expect(readyIds).toContain('TASK-002');
            expect(readyIds).not.toContain('TASK-001'); // 已完成，不应该返回
        });
        it('when all dependencies are completed should return the dependent task', () => {
            const tasks = [
                { id: 'TASK-A', description: '任务A', dependencies: ['TASK-1', 'TASK-2'] }
            ];
            const completedTasks = new Set(['TASK-1', 'TASK-2', 'TASK-3']);
            const readyTasks = getReadyTasks(tasks, completedTasks);
            const readyIds = readyTasks.map(t => t.id);
            expect(readyIds).toContain('TASK-A');
        });
        it('when a dependency is missing should not return the task', () => {
            const tasks = [
                { id: 'TASK-A', description: '任务A', dependencies: ['TASK-1', 'TASK-MISSING'] }
            ];
            const completedTasks = new Set(['TASK-1']);
            const readyTasks = getReadyTasks(tasks, completedTasks);
            const readyIds = readyTasks.map(t => t.id);
            expect(readyIds).not.toContain('TASK-A'); // TASK-MISSING没完成，因此不可执行
        });
    });
    describe('advanced parsing scenarios', () => {
        it('should handle complex tasks.md format', () => {
            const complexContent = `
# 任务分解：Feature X

| 元数据 | 值 |
|--------|-----|
| **Feature ID** | feature-x |
| **状态** | tasked |

---
### 组 1: 数据层 (等待组 0)
- [ ] TASK-001: DB Model 实现 (2h)
- [ ] TASK-002: 数据访问接口 (2h)，依赖TASK-001

### 组 2: 业务逻辑 (等待组 1)  
- [ ] TASK-003: 认证服务 (3h)，依赖 TASK-002
- [ ] TASK-004: 授权服务 (3h)，依赖 TASK-002

### 组 0: 基础设施 (优先执行)
- [ ] TASK-000: 初始化工程目录 (0.5h)

---
## 任务详情

## TASK-000: 初始化工程目录
...

## TASK-001: DB Model 实现  
...

## TASK-002: 数据访问接口
...
`;
            const result = parseTasksMarkdown(complexContent);
            expect(result.groups).toHaveLength(3);
            expect(result.tasks).toHaveLength(5);
            // 确保依赖正确提取
            const task002 = result.tasks.find(t => t.id === 'TASK-002');
            expect(task002?.dependencies).toContain('TASK-001');
            const task003 = result.tasks.find(t => t.id === 'TASK-003');
            expect(task003?.dependencies).toContain('TASK-002');
            const task004 = result.tasks.find(t => t.id === 'TASK-004');
            expect(task004?.dependencies).toContain('TASK-002');
        });
    });
});
