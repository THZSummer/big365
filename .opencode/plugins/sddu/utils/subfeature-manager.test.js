import * as fs from 'fs/promises';
import * as path from 'path';
import { detectFeatureMode, createSubFeature, generateSubFeatureIndex, scanSubFeatures, validateSubFeatureCompleteness } from './subfeature-manager';
// 模拟临时目录
const tempBaseDir = path.join(__dirname, '../../temp-test');
const featureDir = path.join(tempBaseDir, 'test-feature');
describe('SubfeatureManager', () => {
    // 在每个测试之前设置临时环境
    beforeEach(async () => {
        // 清理可能存在的旧数据
        await fs.rm(tempBaseDir, { recursive: true, force: true });
        // 创建测试目录
        await fs.mkdir(featureDir, { recursive: true });
    });
    // 在所有测试结束后清理临时环境
    afterEach(async () => {
        await fs.rm(tempBaseDir, { recursive: true, force: true });
    });
    describe('detectFeatureMode', () => {
        it('应该检测单模块模式', async () => {
            const mode = await detectFeatureMode(featureDir);
            expect(mode).toBe('single');
        });
        it('应该检测多子 Feature 模式', async () => {
            // 创建 sub-features 目录和一个子目录来模拟多子 Feature 模式
            const subFeaturesDir = path.join(featureDir, 'sub-features');
            await fs.mkdir(subFeaturesDir, { recursive: true });
            await fs.mkdir(path.join(subFeaturesDir, 'sub-feature-1'));
            const mode = await detectFeatureMode(featureDir);
            expect(mode).toBe('multi');
        });
        it('当 sub-features 目录为空时，仍检测为单模块模式', async () => {
            // 创建 sub-features 目录，但不添加任何子目录
            const subFeaturesDir = path.join(featureDir, 'sub-features');
            await fs.mkdir(subFeaturesDir, { recursive: true });
            const mode = await detectFeatureMode(featureDir);
            expect(mode).toBe('single');
        });
    });
    describe('createSubFeature', () => {
        it('应该创建子 Feature 目录和文件', async () => {
            const subFeatureId = 'test-sub-feature';
            const name = 'Test Sub Feature';
            const resultPath = await createSubFeature(featureDir, subFeatureId, name);
            const expectedPath = path.join(featureDir, 'sub-features', subFeatureId);
            expect(resultPath).toBe(expectedPath);
            // 验证目录存在
            expect(await fs.stat(resultPath).then(stat => stat.isDirectory())).toBe(true);
            // 验证必需的文件存在
            const specPath = path.join(resultPath, 'spec.md');
            const readmePath = path.join(resultPath, 'README.md');
            const statePath = path.join(resultPath, '.state.json');
            expect(await pathExists(specPath)).toBe(true);
            expect(await pathExists(readmePath)).toBe(true);
            expect(await pathExists(statePath)).toBe(true);
            // 验证 spec.md 内容
            const specContent = await fs.readFile(specPath, 'utf8');
            expect(specContent).toContain(`# 子 Feature: ${name}`);
            // 验证 README.md 内容
            const readmeContent = await fs.readFile(readmePath, 'utf8');
            expect(readmeContent).toContain(name);
            // 验证 .state.json 内容
            const stateContent = await fs.readFile(statePath, 'utf8');
            const stateData = JSON.parse(stateContent);
            expect(stateData.id).toBe(subFeatureId);
            expect(stateData.name).toBe(name);
            expect(stateData.status).toBe('specified');
        });
        it('应该在创建时设置正确的目录结构', async () => {
            const subFeatureId = 'nested-test';
            const name = 'Nested Test';
            await createSubFeature(featureDir, subFeatureId, name);
            const subFeaturesDir = path.join(featureDir, 'sub-features');
            const subFeatureDir = path.join(subFeaturesDir, subFeatureId);
            // 特性根目录下应该有 sub-features 目录
            expect(await pathExists(subFeaturesDir)).toBe(true);
            // sub-features 目录下应该有子特性目录
            expect(await pathExists(subFeatureDir)).toBe(true);
        });
    });
    describe('generateSubFeatureIndex', () => {
        it('在单模块模式下应该返回空字符串', async () => {
            const index = await generateSubFeatureIndex(featureDir);
            expect(index).toBe('');
        });
        it('在多子 Feature 模式下应该生成正确的索引表', async () => {
            // 创建多子 Feature 环境
            const subFeaturesDir = path.join(featureDir, 'sub-features');
            await fs.mkdir(subFeaturesDir, { recursive: true });
            // 创建一个子 Feature
            const subFeatureId = 'my-sub-feature';
            const name = 'My Sub Feature';
            await createSubFeature(featureDir, subFeatureId, name);
            // 生成索引
            const index = await generateSubFeatureIndex(featureDir);
            expect(index).toContain('| 子 Feature ID | 子 Feature 名称 | 目录路径 | 状态 | 负责人 | 阻塞依赖 |');
            expect(index).toContain(`| ${subFeatureId} | ${name} | sub-features/${subFeatureId} | specified | - | - |`);
        });
        it('对多个子 Feature 应该生成完整索引', async () => {
            // 创建多子 Feature 环境
            const subFeaturesDir = path.join(featureDir, 'sub-features');
            await fs.mkdir(subFeaturesDir, { recursive: true });
            // 创建多个子 Feature
            await createSubFeature(featureDir, 'sf-1', 'Sub Feature 1');
            await createSubFeature(featureDir, 'sf-2', 'Sub Feature 2');
            // 生成索引
            const index = await generateSubFeatureIndex(featureDir);
            expect(index).toContain('sf-1');
            expect(index).toContain('sf-2');
            expect(index).toContain('Sub Feature 1');
            expect(index).toContain('Sub Feature 2');
        });
        it('当某子 Feature 的 spec 文件缺失时，应该使用默认值', async () => {
            // 创建多子 Feature 环境
            const subFeaturesDir = path.join(featureDir, 'sub-features');
            await fs.mkdir(subFeaturesDir, { recursive: true });
            // 创建一个子目录但没有标准文件
            const testSubDir = path.join(subFeaturesDir, 'broken-sub-feature');
            await fs.mkdir(testSubDir, { recursive: true });
            // 生成索引
            const index = await generateSubFeatureIndex(featureDir);
            expect(index).toContain('broken-sub-feature');
        });
    });
    describe('scanSubFeatures', () => {
        it('当是单模块模式时应返回空数组', async () => {
            const result = await scanSubFeatures(featureDir);
            expect(result).toEqual([]);
        });
        it('应该找到并返回所有子 Feature', async () => {
            // 创建多子 Feature 环境
            const subFeaturesDir = path.join(featureDir, 'sub-features');
            await fs.mkdir(subFeaturesDir, { recursive: true });
            // 创建一些子 Feature
            await createSubFeature(featureDir, 'first-sub', 'First Sub');
            await createSubFeature(featureDir, 'second-sub', 'Second Sub');
            const subFeatures = await scanSubFeatures(featureDir);
            expect(subFeatures).toHaveLength(2);
            expect(subFeatures.some(sf => sf.id === 'first-sub')).toBe(true);
            expect(subFeatures.some(sf => sf.id === 'second-sub')).toBe(true);
        });
        it('应该正确提取子 Feature 的状态信息', async () => {
            // 创建多子 Feature 环境
            const subFeaturesDir = path.join(featureDir, 'sub-features');
            await fs.mkdir(subFeaturesDir, { recursive: true });
            // 创建一个子 Feature
            await createSubFeature(featureDir, 'state-test', 'State Test');
            // 更新其状态文件
            const stateFilePath = path.join(subFeaturesDir, 'state-test', '.state.json');
            const stateData = JSON.parse(await fs.readFile(stateFilePath, 'utf8'));
            stateData.status = 'implemented';
            stateData.assignee = 'test-user';
            await fs.writeFile(stateFilePath, JSON.stringify(stateData, null, 2));
            const subFeatures = await scanSubFeatures(featureDir);
            const targetSubFeature = subFeatures.find(sf => sf.id === 'state-test');
            expect(targetSubFeature).toBeDefined();
            if (targetSubFeature) {
                expect(targetSubFeature.status).toBe('implemented');
                expect(targetSubFeature.assignee).toBe('test-user');
            }
        });
    });
    describe('validateSubFeatureCompleteness', () => {
        let testSubFeature;
        beforeEach(() => {
            testSubFeature = {
                id: 'test-validation',
                name: 'Test Validation',
                status: 'specified',
                dir: 'sub-features/test-validation'
            };
            // 设置 process.cwd() 模拟为临时测试目录
            jest.spyOn(process, 'cwd').mockReturnValue(tempBaseDir);
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });
        it('对于完整的子 Feature，验证应该通过', async () => {
            // 创建子 Feature 目录结构
            const subDirPath = path.join(tempBaseDir, 'specs-tree-root', testSubFeature.dir);
            await fs.mkdir(subDirPath, { recursive: true });
            // 创建所有必需的文件
            await fs.writeFile(path.join(subDirPath, 'spec.md'), '# Test Spec');
            await fs.writeFile(path.join(subDirPath, 'plan.md'), '# Test Plan');
            await fs.writeFile(path.join(subDirPath, 'tasks.md'), '# Test Tasks');
            await fs.writeFile(path.join(subDirPath, 'README.md'), '# Test Readme');
            await fs.writeFile(path.join(subDirPath, '.state.json'), '{}');
            const validation = validateSubFeatureCompleteness(testSubFeature);
            expect(validation.valid).toBe(true);
            expect(validation.missing).toEqual([]);
        });
        it('对于缺少文件的子 Feature，验证应失败并显示缺失的文件', async () => {
            // 只创建目录，但不创建必需的文件
            const subDirPath = path.join(tempBaseDir, 'specs-tree-root', testSubFeature.dir);
            await fs.mkdir(subDirPath, { recursive: true });
            // 不创建 plan.md 和 tasks.md
            await fs.writeFile(path.join(subDirPath, 'spec.md'), '# Test Spec');
            await fs.writeFile(path.join(subDirPath, 'README.md'), '# Test Readme');
            await fs.writeFile(path.join(subDirPath, '.state.json'), '{}');
            const validation = validateSubFeatureCompleteness(testSubFeature);
            expect(validation.valid).toBe(false);
            expect(validation.missing).toContain('plan.md');
            expect(validation.missing).toContain('tasks.md');
        });
    });
});
// 帮助函数
async function pathExists(filepath) {
    try {
        await fs.access(filepath);
        return true;
    }
    catch (error) {
        return false;
    }
}
