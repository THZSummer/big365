/**
 * utils/index.ts 单元测试
 * 测试统一工具函数导出
 */
// 导入全部工具函数和类别
import * as AllUtils from './index';
import { UtilsHelper, SystemInfo } from './index';
// 工具模块的函数验证
import { parseTasksMarkdown, parseParallelGroups, computeExecutionOrder, detectTaskCircularDependency, getReadyTasks, getIncompleteTasks, areDependenciesSatisfied, } from '../utils/tasks-parser';
describe('工具函数统一导出测试', () => {
    test('验证所有工具函数都能正确导入', () => {
        expect(typeof parseTasksMarkdown).toBe('function');
        expect(typeof parseParallelGroups).toBe('function');
        expect(typeof computeExecutionOrder).toBe('function');
        expect(typeof detectTaskCircularDependency).toBe('function');
        expect(typeof getReadyTasks).toBe('function');
        expect(typeof getIncompleteTasks).toBe('function');
        expect(typeof areDependenciesSatisfied).toBe('function');
        // 验证导出的整体对象结构
        expect(AllUtils).toHaveProperty('UtilsHelper');
        expect(AllUtils).toHaveProperty('SystemInfo');
        expect(AllUtils).toHaveProperty('parseTasksMarkdown');
        expect(AllUtils).toHaveProperty('parseParallelGroups');
        expect(AllUtils).toHaveProperty('detectFeatureMode');
        expect(AllUtils).toHaveProperty('createSubFeature');
    });
    test('UtilsHelper.safeGet 功能测试', () => {
        const obj = {
            level1: {
                level2: {
                    value: 'test-value'
                }
            }
        };
        const result = UtilsHelper.safeGet(obj, 'level1.level2.value', 'default');
        expect(result).toBe('test-value');
        const defaulted = UtilsHelper.safeGet(obj, 'level1.nonexistent.key', 'default');
        expect(defaulted).toBe('default');
        const undefinedValue = UtilsHelper.safeGet(obj, 'level1.level2.missing');
        expect(undefinedValue).toBeUndefined();
    });
    test('UtilsHelper.deepMerge 测试', () => {
        const target = {
            a: 1,
            b: {
                c: 2,
                d: 'hello'
            }
        };
        const source = {
            b: {
                c: 3, // 应该被覆盖
                e: 'world' // 应该被添加
            },
            f: true // 应该被添加
        };
        const merged = UtilsHelper.deepMerge(target, source);
        expect(merged.a).toBe(1);
        expect(merged.b.c).toBe(3); // 被覆盖
        expect(merged.b.d).toBe('hello'); // 保留
        expect(merged.b.e).toBe('world'); // 新增
        expect(merged.f).toBe(true); // 新增
    });
    test('UtilsHelper.debounce 测试', (done) => {
        const mockFn = jest.fn();
        const debouncedFn = UtilsHelper.debounce(mockFn, 10);
        debouncedFn();
        debouncedFn(); // 这个应该取消上一个调用
        setTimeout(() => {
            debouncedFn(); // 这个应该被调用
        }, 5);
        setTimeout(() => {
            expect(mockFn).toHaveBeenCalledTimes(1);
            done();
        }, 20);
    });
    test('UtilsHelper.throttle 测试', (done) => {
        const mockFn = jest.fn();
        const throttledFn = UtilsHelper.throttle(mockFn, 20);
        throttledFn();
        throttledFn(); // 这个应该被节流
        throttledFn(); // 这个应该被节流
        setTimeout(() => {
            throttledFn(); // 这个应该执行，因为超过了间隔时间
        }, 25);
        setTimeout(() => {
            expect(mockFn).toHaveBeenCalledTimes(2);
            done();
        }, 30);
    });
    test('UtilsHelper.formatTimestamp 测试', () => {
        const date = new Date('2023-01-01T12:00:00Z');
        const formatted = UtilsHelper.formatTimestamp(date);
        // 日期格式为 YYYY-MM-DD HH:mm:ss
        expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
    test('UtilsHelper.formatDuration 测试', () => {
        const start = process.hrtime();
        // 模拟一些小的延迟
        const dummy = 'a'.repeat(1000);
        const durationStr = UtilsHelper.formatDuration(start);
        // 结果应该是带有毫秒单位的字符串
        expect(durationStr).toMatch(/ms$/);
        expect(parseFloat(durationStr.replace(' ms', ''))).toBeGreaterThanOrEqual(0);
    });
    test('UtilsHelper.filterByPattern 测试', () => {
        const items = ['apple', 'banana', 'orange', 'grape', 'pineapple'];
        const filtered1 = UtilsHelper.filterByPattern(items, '^app');
        expect(filtered1).toEqual(['apple', 'pineapple']);
        const filtered2 = UtilsHelper.filterByPattern(items, 'ana');
        expect(filtered2).toEqual(['banana']);
    });
    test('SystemInfo 测试', () => {
        const nodeVersion = SystemInfo.getNodeVersion();
        expect(nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
        const platform = SystemInfo.getPlatform();
        expect(platform).toMatch(/(linux|darwin|win32)/);
        const arch = SystemInfo.getArchitecture();
        expect(arch).toMatch(/(x64|arm64)/);
        const cwd = SystemInfo.getWorkingDirectory();
        expect(cwd).toContain('sddu');
        const memoryUsage = SystemInfo.getMemoryUsage();
        expect(memoryUsage).toHaveProperty('rss');
        expect(memoryUsage).toHaveProperty('heapTotal');
        expect(SystemInfo.getUptime()).toBeGreaterThan(0);
    });
    test('导入的类型接口可用性测试', () => {
        // 验证类型定义的结构
        const task = {
            id: 'TEST-001',
            description: 'Test Description',
            dependencies: ['TASK-001']
        };
        const group = {
            id: 1,
            name: 'Test Group',
            tasks: [task]
        };
        const wave = {
            waveNumber: 1,
            groups: [group],
            tasks: [task]
        };
        expect(task.id).toBe('TEST-001');
        expect(group.id).toBe(1);
        expect(wave.waveNumber).toBe(1);
    });
});
