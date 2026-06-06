import * as fs from 'fs/promises';
import * as path from 'path';
import { scanTreeStructure } from './tree-scanner';
/**
 * 自动状态更新器
 * 监听文件变化并自动更新 Feature 状态
 */
export class AutoUpdater {
    stateMachine;
    debounceTimer = null;
    debounceDelay = 5000; // 5秒防抖延迟
    enabled = true;
    specsDir;
    // 关键文件列表，用于确定 Feature 状态
    keyFiles = {
        'drafting': [], // 空状态或刚创建
        'discovered': ['discovery.md'], // 包含发现文档
        'specified': ['spec.md'], // spec.md 存在
        'planned': ['spec.md', 'plan.md'], // spec.md 和 plan.md 存在
        'tasked': ['spec.md', 'plan.md', 'tasks.md'], // spec.md, plan.md, tasks.md 存在
        'implementing': ['spec.md', 'plan.md', 'tasks.md'], // 实现期间保持 tasked 文件
        'reviewed': ['spec.md', 'plan.md', 'tasks.md'], // review 是过程状态，保留原始文件
        'validated': ['spec.md', 'plan.md', 'tasks.md', 'validation.md'], // 有验证文件
        'completed': ['spec.md', 'plan.md', 'tasks.md'] // 验证后为完成状态
    };
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        this.specsDir = stateMachine['specsDir'];
    }
    /**
     * 启用/禁用自动更新器
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * 启用防抖以避免频繁更新
     */
    debouncedUpdate(targetPath) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.scanAndAutoUpdate(targetPath).catch(error => {
                console.error('AutoUpdater scan error:', error);
            });
        }, this.debounceDelay);
    }
    /**
     * 扫描并自动更新相关的 Feature 状态 - 支持嵌套路径
     */
    async scanAndAutoUpdate(targetPath) {
        if (!this.enabled) {
            return;
        }
        try {
            console.log(`AutoUpdater: 开始扫描 ${targetPath || '所有目录'} 的状态变更`);
            let featuresToCheck = [];
            if (targetPath) {
                // Extract feature path correctly for nested structures
                const pathParts = targetPath.split(/[\/\\]specs-tree-/); // Split on directory separator followed by specs-tree-
                if (pathParts.length > 1) {
                    // Extract the feature path including nesting levels
                    const fullRelativePath = pathParts.slice(1).join('specs-tree-'); // Get the part after the first occurrence
                    // Find the actual feature path in the tree structure
                    if (targetPath.includes('specs-tree-')) {
                        const treeStructure = await scanTreeStructure(this.specsDir);
                        // Try to locate the feature path that contains the targetFile
                        const potentialPaths = Array.from(treeStructure.flatMap.keys()).sort((a, b) => {
                            // Sort by length descending to match most specific path first
                            return b.length - a.length;
                        });
                        for (const featurePath of potentialPaths) {
                            if (targetPath.startsWith(featurePath)) {
                                featuresToCheck = [featurePath];
                                break;
                            }
                        }
                    }
                }
                else {
                    // Fallback to the old method if the path pattern doesn't match
                    featuresToCheck = await this.getAllFeatureIds();
                }
            }
            else {
                // Scan all Features using TreeScanner for nested paths
                featuresToCheck = await this.getAllFeatureIds();
            }
            // Check each feature that needs to be checked for state updates
            for (const featurePath of featuresToCheck) {
                await this.updateFeatureStatusForFileChanges(featurePath);
            }
        }
        catch (error) {
            console.error('AutoUpdater 扫描失败:', error);
        }
    }
    /**
     * 使用 TreeScanner 来获取所有 Feature 路径列表 - 支持嵌套结构
     */
    async getAllFeatureIds() {
        try {
            const treeResult = await scanTreeStructure(this.specsDir);
            const featurePaths = Array.from(treeResult.flatMap.keys());
            console.log(`Found features: ${featurePaths.join(', ')}`);
            return featurePaths;
        }
        catch (error) {
            console.error('获取 Features 列表失败:', error);
            return [];
        }
    }
    /**
     * 推断给定 Feature 目录中的最新状态
     */
    async inferCurrentStateFromFiles(featurePath) {
        try {
            const dirContents = await fs.readdir(featurePath);
            // 从最高级别的状态开始尝试匹配
            const stateOrder = [
                'validated', 'reviewed', 'implementing', 'tasked', 'planned',
                'specified', 'discovered', 'drafting'
            ];
            for (const state of stateOrder) {
                const requiredFiles = this.keyFiles[state] || [];
                const missingFiles = await this.checkMissingFiles(featurePath, requiredFiles);
                if (missingFiles.length === 0 && state !== 'implementing' && state !== 'reviewed') {
                    return state;
                }
                // 对于实现过程和审查中的特殊状态，需要特别处理
                if (state === 'implementing' || state === 'reviewed') {
                    // 检查这些状态依赖的基础文件是否存在
                    const basicRequiredFiles = this.keyFiles['tasked'] || [];
                    const basicMissing = await this.checkMissingFiles(featurePath, basicRequiredFiles);
                    if (basicMissing.length === 0) {
                        // 基础文件存在，我们可以确定当前处于进行中状态
                        return state === 'implementing' ? 'implementing' : 'reviewed';
                    }
                }
            }
            // 检查是否包含发现文档但没有 spec -> discovered 状态
            const hasDiscoveryDoc = dirContents.some(f => f === 'discovery.md');
            if (hasDiscoveryDoc) {
                return 'discovered';
            }
            // 检查其他基础功能文件
            if (dirContents.some(f => f.includes('spec'))) {
                return 'specified';
            }
            // 默认为 drafting 状态（如果目录存在但没有特征文件）
            if (await this.isFeatureDirectory(featurePath)) {
                return 'drafting';
            }
            return null;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // Feature 目录不存在
                console.log(`Feature 目录不存在: ${featurePath}`);
                return null;
            }
            console.error(`无法推断 Feature ${featurePath} 的状态:`, error);
            return null;
        }
    }
    /**
     * 检查 Feature 目录下是否有任何相关文件
     */
    async isFeatureDirectory(dirPath) {
        try {
            const contents = await fs.readdir(dirPath);
            // 检查是否有多数我们认为的相关文件
            const relevantFiles = contents.filter(file => file.endsWith('.md') ||
                file === 'src' ||
                file === 'tests' ||
                file === 'package.json');
            return relevantFiles.length > 0; // 只要有任意文件或目录，就认为是个有效的 Feature 目录
        }
        catch (error) {
            return false;
        }
    }
    /**
     * 检查给定目录中缺失的文件
     */
    async checkMissingFiles(dir, requiredFiles) {
        const missing = [];
        for (const file of requiredFiles) {
            try {
                await fs.access(path.join(dir, file));
            }
            catch {
                missing.push(file);
            }
        }
        return missing;
    }
    /**
     * 为文件变化更新单个 Feature 的状态
     */
    async updateFeatureStatusForFileChanges(featurePath) {
        try {
            // Extract feature ID from the path
            const pathComponents = featurePath.split(/[\/\\]/);
            const featureId = pathComponents[pathComponents.length - 1]; // Last component could be feature id
            // From actual feature path in nested structure  
            const actualFeatureName = featurePath.split(/[\/\\]specs-tree-/).pop()?.split(/[\/\\]/)[0] || featurePath;
            // 从文件系统推理当前状态
            const inferredState = await this.inferCurrentStateFromFiles(featurePath);
            if (inferredState === null) {
                console.log(`无法为路径 ${featurePath} 推断新的状态，跳过更新`);
                return;
            }
            // 从状态机获取当前状态 - now with full feature path instead of just id
            const currentStateObj = await this.stateMachine.getState(featurePath);
            const currentState = currentStateObj ? this.mapStatusToState(currentStateObj.status) : 'drafting';
            // 检查状态是否真的发生了改变
            if (currentState === inferredState) {
                console.log(`Feature ${actualFeatureName} 状态未发生改变 (${currentState})，跳过更新`);
                return;
            }
            // 检查是否是父级特征，如果是，可能只需要有限的状态更新
            const isParent = await this.stateMachine.isParentFeature(featurePath);
            if (isParent && this.stateRequiresAdvancedHandling(inferredState)) {
                console.log(`跳过高级状态更新 ${inferredState} 对于父级 feature ${actualFeatureName}，仅允许规格/规划级状态`);
                return;
            }
            // 检查状态转换是否合理
            if (this.shouldUpdateState(currentState, inferredState)) {
                console.log(`AutoUpdater: 更新 Feature ${actualFeatureName} 从 ${currentState} 到 ${inferredState} (路径: ${featurePath})`);
                // 更新状态到状态机，跳过常规验证，因为我们是从文件状态推导的
                await this.stateMachine.updateState(featurePath, inferredState, {}, 'auto-updater', `自动检测到状态从 ${currentState} 到 ${inferredState}`, true, isParent); // 跳过验证
            }
            else {
                console.log(`状态变化无效，跳过更新: ${actualFeatureName} 从 ${currentState} 到 ${inferredState}`);
            }
        }
        catch (error) {
            console.error(`自动更新 Feature 路径 ${featurePath} 状态失败:`, error);
        }
    }
    /**
     * Maps the Status to State for comparison purposes
     */
    mapStatusToState(status) {
        switch (status) {
            case 'specified': return 'specified';
            case 'planned': return 'planned';
            case 'tasked': return 'tasked';
            case 'building': return 'implementing';
            case 'reviewed': return 'reviewed';
            case 'validated': return 'validated';
            default: return 'drafting';
        }
    }
    /**
     * Checks if state requires advanced handling (not allowed for parent features)
     */
    stateRequiresAdvancedHandling(state) {
        return ['implementing', 'reviewed', 'validated', 'completed'].includes(state);
    }
    /**
     * 判断是否应该执行状态更新
     *
     * 仅当日志化状态从早期阶段到晚期阶段时，或者状态真正发生变化但仍在合理范围内时生效
     */
    shouldUpdateState(currentState, targetState) {
        if (currentState === targetState) {
            return false; // 状态相同则不更新
        }
        // 使用状态机的有效转换规则
        // 一般来说，我们允许正向转换但不支持反向转换
        const stateOrder = {
            'drafting': 0,
            'discovered': 1,
            'specified': 2,
            'planned': 3,
            'tasked': 4,
            'implementing': 5,
            'reviewed': 6,
            'validated': 7,
            'completed': 8
        };
        const currentOrder = stateOrder[currentState] ?? -1;
        const targetOrder = stateOrder[targetState] ?? -1;
        return targetOrder > currentOrder; // 仅当目标状态顺序高于当前状态时才更新
    }
    /**
     * 监听指定目录的文件变更事件
     * 在实际环境中，这个方法会被 VSCode 文件更改事件驱动
     */
    listenForChanges(dirPath) {
        console.log('AutoUpdater: 准备监听文件变更...');
        // 注意：实际集成会依赖 VSCode 的 FileSystemWatcher 或类似机制
        // 这里我们仅提供一个可以被事件触发的接口
    }
    /**
     * 触发自动更新检查（供外部事件处理器使用）
     */
    triggerAutoUpdate(targetPath) {
        if (!this.enabled) {
            console.log('AutoUpdater: 已禁用，跳过触发');
            return;
        }
        console.log(`AutoUpdater: 检测到文件变更，准备扫描${targetPath ? ` @ ${targetPath}` : ''}`);
        this.debouncedUpdate(targetPath);
    }
    /**
     * 清理资源：取消所有待处理的定时器
     */
    dispose() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }
}
