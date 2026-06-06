import fs from 'fs/promises';
import path from 'path';
import { migrateState, backupState, rollbackState, hasBackup } from './migrator';
describe('状态迁移工具测试', () => {
    const mockFeatureId = 'test-feature';
    const mockSpecsDir = '/tmp/test-specs';
    const mockSpecsPath = path.join(mockSpecsDir, mockFeatureId);
    beforeEach(async () => {
        // 清理测试环境
        try {
            await fs.rm(mockSpecsDir, { recursive: true, force: true });
        }
        catch (err) {
            // 忽略清理错误
        }
        // 创建测试目录
        await fs.mkdir(mockSpecsPath, { recursive: true });
    });
    afterEach(async () => {
        // 清理测试数据
        try {
            await fs.rm(mockSpecsDir, { recursive: true, force: true });
        }
        catch (err) {
            // 忽略清理错误
        }
    });
    describe('backupState 函数测试', () => {
        test('应该在备份目录创建备份文件', async () => {
            const testState = { feature: 'test', status: 'testing' };
            const backupPath = await backupState(testState, mockFeatureId, mockSpecsDir);
            expect(backupPath).toContain('.state.backup');
            expect(backupPath).toContain('state-');
            expect(backupPath).toContain('.json');
            // 验证备份文件存在并包含正确的数据
            const backupContent = await fs.readFile(backupPath, 'utf-8');
            const parsedBackup = JSON.parse(backupContent);
            expect(parsedBackup).toEqual(testState);
        });
        test('应该确保备份目录存在', async () => {
            const testState = { feature: 'test', status: 'testing' };
            // 删除 specs 目录来验证备份目录的创建
            await fs.rm(mockSpecsDir, { recursive: true, force: true });
            await fs.mkdir(path.dirname(mockSpecsPath), { recursive: true });
            await backupState(testState, mockFeatureId, mockSpecsDir);
            // 验证备份目录已创建
            const hasBackup = await fs.stat(path.join(mockSpecsDir, '.state.backup'));
            expect(hasBackup.isDirectory()).toBe(true);
        });
    });
    describe('migrateState 函数测试', () => {
        test('当状态已经是最新版本时不应迁移', async () => {
            const latestState = {
                version: '2.0.0',
                feature: 'test-feature',
                status: 'planned',
                phase: 2
            };
            const result = await migrateState(latestState, mockFeatureId, mockSpecsDir);
            expect(result.success).toBe(true);
            expect(result.migratedToVersion).toBe('2.0.0');
        });
        test('应该从 v1.1.1 版本迁移并创建备份', async () => {
            const oldState = {
                feature: 'test-migration',
                status: 'planned',
                createdAt: '2026-03-01T00:00:00Z',
                updatedAt: '2026-03-01T00:00:00Z'
            };
            const result = await migrateState(oldState, mockFeatureId, mockSpecsDir);
            expect(result.success).toBe(true);
            expect(result.backupPath).toBeDefined();
            // 验证备份文件存在
            const backupExists = await fs.access(result.backupPath ? result.backupPath : '').then(() => true).catch(() => false);
            expect(backupExists).toBe(true);
        });
        test('应该处理缺少版本号的老状态', async () => {
            const oldState = {
                feature: 'test-no-version',
                status: 'specified',
                someData: 'value'
            };
            const result = await migrateState(oldState, mockFeatureId, mockSpecsDir);
            expect(result.success).toBe(true);
            expect(result.backupPath).toBeDefined();
        });
        test('当迁移失败时应该返回错误', async () => {
            // 通过模拟 fs 函数的错误来测试错误处理
            const readonlyState = Object.freeze({
                feature: 'readonly-test',
                status: 'planned'
            });
            const result = await migrateState(readonlyState, mockFeatureId, '/nonexistent/path');
            // 这里我们只是测试基本的错误路径，实际错误可能取决于具体失败点
            expect(result.success).toBe(false);
            expect(typeof result.error).toBe('string');
        });
    });
    describe('hasBackup 函数测试', () => {
        test('应该检测到存在的备份', async () => {
            // 先创建一个备份
            const testState = { feature: 'test', status: 'testing' };
            await backupState(testState, mockFeatureId, mockSpecsDir);
            const hasBkp = await hasBackup(mockSpecsDir);
            expect(hasBkp).toBe(true);
        });
        test('应该当没有备份时返回 false', async () => {
            const hasBkp = await hasBackup(mockSpecsDir);
            expect(hasBkp).toBe(false);
        });
        test('应该当备份目录不存在时返回 false', async () => {
            const nonexistentDir = '/tmp/nonexistent-specs';
            const hasBkp = await hasBackup(nonexistentDir);
            expect(hasBkp).toBe(false);
        });
    });
    describe('rollbackState 函数测试', () => {
        test('应该能够回滚到指定的备份', async () => {
            const originalState = { feature: 'rollback-test', status: 'backed-up', version: '1.0' };
            // 创建备份
            const backupPath = await backupState(originalState, mockFeatureId, mockSpecsDir);
            // 改变状态
            const modifiedState = { feature: 'rollback-test', status: 'changed', version: '1.2.5', mode: 'multi' };
            // 执行回滚
            const rolledBackState = await rollbackState(mockFeatureId, mockSpecsDir, backupPath);
            expect(rolledBackState).toEqual(originalState);
        });
        test('应该在没有指定备份路径时查找最新备份', async () => {
            const state1 = { feature: 'rollback-auto', version: 1, timestamp: 'first' };
            const state2 = { feature: 'rollback-auto', version: 2, timestamp: 'second' };
            // 连续创建两个备份 - 第二个应该是最新的
            const backupPath1 = await backupState(state1, mockFeatureId, mockSpecsDir);
            // 等待一下，确保第二个备份有不同时间戳
            await new Promise(resolve => setTimeout(resolve, 10));
            const backupPath2 = await backupState(state2, mockFeatureId, mockSpecsDir);
            // 执行回滚而不指定备份路径（会使用最新的）
            const rolledBackState = await rollbackState(mockFeatureId, mockSpecsDir);
            expect(rolledBackState).toEqual(state2);
        });
        test('应该在没有备份时抛出错误', async () => {
            await expect(rollbackState(mockFeatureId, mockSpecsDir))
                .rejects
                .toThrow('无法回滚: 未找到备份目录');
        });
        test('应该在指定备份不存在时抛出错误', async () => {
            const fakeBackupPath = path.join(mockSpecsDir, '.state.backup', 'nonexistent.json');
            await expect(rollbackState(mockFeatureId, mockSpecsDir, fakeBackupPath))
                .rejects
                .toThrow('备份文件不存在:');
        });
    });
    describe('集成测试', () => {
        test('完整的迁移流程：备份 -> 迁移 -> (可选)回滚', async () => {
            const originalState = {
                feature: 'integration-test',
                status: 'planned',
                createdAt: '2026-03-01T00:00:00Z'
            };
            // 验证没有备份
            expect(await hasBackup(mockSpecsDir)).toBe(false);
            // 迁移状态
            const result = await migrateState(originalState, mockFeatureId, mockSpecsDir);
            expect(result.success).toBe(true);
            expect(result.backupPath).toBeDefined();
            expect(result.migratedToVersion).toBe('2.0.0');
            // 迁移后应该有备份
            expect(await hasBackup(mockSpecsDir)).toBe(true);
            // 验证可以从备份恢复原始状态
            const restoredState = await rollbackState(mockFeatureId, mockSpecsDir, result.backupPath);
            expect(restoredState).toEqual(originalState);
        });
    });
});
