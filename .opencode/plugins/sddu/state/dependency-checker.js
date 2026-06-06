// 依赖状态检查器
// 基于 MultiFeatureManager 的依赖图实现状态级别的依赖检查
import * as fs from 'fs/promises';
import * as path from 'path';
import { scanTreeStructure } from './tree-scanner';
import { ErrorCode, TreeStructureError } from '../errors';
/**
 * 依赖状态检查器
 *
 * 支持跨子树依赖解析，处理嵌套特征的依赖关系
 *
 * 检查规则:
 * - 状态前进时：检查所有依赖 Feature 的状态 ≥ 当前状态
 * - 状态回退时：警告检查被依赖 Feature 的状态
 */
export class DependencyChecker {
    stateMachine;
    specsDir;
    // 缓存机制
    cache = new Map();
    cacheExpiry = 5000; // 5 秒缓存过期
    lastCacheUpdate = 0;
    constructor(stateMachine, specsDir = '.sddu/specs-tree-root') {
        this.stateMachine = stateMachine;
        this.specsDir = specsDir;
    }
    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
        this.lastCacheUpdate = 0;
    }
    /**
     * 使用 TreeScanner 扫描所有 Features 状态并构建依赖图，支持嵌套结构
     */
    async scanAllFeatures() {
        const now = Date.now();
        // 检查缓存是否有效
        if (this.cache.size > 0 && now - this.lastCacheUpdate < this.cacheExpiry) {
            return this.cache;
        }
        const features = new Map();
        try {
            // Use TreeScanner to find all features in nested structure
            const treeStructure = await scanTreeStructure(this.specsDir);
            for (const [featurePath, _] of treeStructure.flatMap.entries()) {
                try {
                    const stateFile = path.join(featurePath, 'state.json');
                    // Extract feature id from the path
                    const pathComponents = featurePath.split(/[\/\\]/);
                    const featureId = pathComponents[pathComponents.length - 1]; // Last component is feature name/directory
                    // Read the state file
                    const stateContent = await fs.readFile(stateFile, 'utf-8');
                    const state = JSON.parse(stateContent);
                    // Map the workflow status to feature state enum
                    const featureStateEnum = this.mapStatusToState(state.status);
                    features.set(featurePath, {
                        featureId,
                        featureName: state.name || state.feature || featureId,
                        featurePath, // Store the full path in tree structure
                        state: featureStateEnum,
                        dependencies: state.dependencies?.on || [] // May contain paths to other features
                    });
                }
                catch (error) {
                    // state.json 不存在或格式错误，跳过
                    console.warn(`无法读取 Feature 路径 ${featurePath} 的状态文件:`, error.message);
                }
            }
            // 更新缓存
            this.cache = features;
            this.lastCacheUpdate = now;
        }
        catch (error) {
            console.error('扫描嵌套 Features 失败:', error);
            if (error instanceof TreeStructureError) {
                throw error;
            }
            else {
                throw new TreeStructureError(ErrorCode.TREE_SCAN_FAILED, `Failed to scan nested features: ${error.message}`);
            }
        }
        return features;
    }
    /**
     * 检查 Feature 状态前进的依赖 - 支持跨子树依赖
     *
     * 规则: 所有依赖 Feature 的状态必须 ≥ 当前状态
     */
    async checkDependenciesForStateChange(featurePath, // Full path to the feature in the tree
    targetState) {
        const features = await this.scanAllFeatures();
        const feature = features.get(featurePath);
        if (!feature) {
            return {
                allowed: true,
                reason: 'Feature 不存在于状态文件中，跳过依赖检查'
            };
        }
        const blockingFeatures = [];
        const warnings = [];
        // 检查所有依赖 Feature
        for (const dependencyPath of feature.dependencies) {
            const depFeature = features.get(dependencyPath); // Use exact path from resolved dependencies
            // If dependency isn't found at the given path, try to resolve from the map
            if (!depFeature) {
                // Look for the dependency in the map (could be a name or partial path that needs resolution)
                const resolvedDep = this.resolveDependencyPath(features, dependencyPath, featurePath);
                if (!resolvedDep) {
                    warnings.push(`依赖的 Feature ${dependencyPath} 不存在`);
                    continue;
                }
            }
            const resolvedDep = features.get(dependencyPath) || this.tryMatchDepInTree(features, dependencyPath, featurePath);
            if (!resolvedDep) {
                warnings.push(`依赖的 Feature ${dependencyPath} 不存在或未找到`);
                continue;
            }
            // Check if the dependency meets status requirements for the target state
            if (!this.isStateReady(resolvedDep.state, targetState)) {
                blockingFeatures.push({
                    featureId: resolvedDep.featureId,
                    featureName: resolvedDep.featureName,
                    currentState: resolvedDep.state,
                    requiredState: targetState
                });
            }
        }
        // If there are blocking dependencies, disallow changing state
        if (blockingFeatures.length > 0) {
            return {
                allowed: false,
                reason: `存在 ${blockingFeatures.length} 个未就绪的依赖 Feature`,
                blockingFeatures,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        }
        // Check passed
        return {
            allowed: true,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }
    /**
     * Attempt to find the dependency in the tree structure based on partial identifiers
     */
    tryMatchDepInTree(features, depIdentifier, currentFeaturePath) {
        // First, try perfect match in the path
        for (const [path, info] of features) {
            if (path.includes(depIdentifier) || info.featureId.includes(depIdentifier) || info.featureName.includes(depIdentifier)) {
                return info;
            }
            // Try to match by comparing paths in a hierarchical way
            const currentPathParts = currentFeaturePath.split(/[\/\\]/);
            const candidatePathParts = path.split(/[\/\\]/);
            // If same directory level, compare names, otherwise match by path
            if (path !== currentFeaturePath) {
                // Try matching in the same subfolder first
                if (this.isSameParentDirectory(currentPathParts, candidatePathParts)) {
                    if (info.featureId === depIdentifier || info.featureName === depIdentifier) {
                        return info;
                    }
                }
            }
        }
        return undefined; // Not found
    }
    /**
     * Check if two paths share same parent directory
     */
    isSameParentDirectory(pathA, pathB) {
        // Exclude the feature folder itself, only compare the parent directories
        if (pathA.length < 2 || pathB.length < 2)
            return false;
        // Compare from beginning until penultimate - last elements are feature names
        const parentPathA = pathA.slice(0, pathA.length - 1).join('/');
        const parentPathB = pathB.slice(0, pathB.length - 1).join('/');
        return parentPathA === parentPathB;
    }
    /**
     * Resolve dependency path in relation to current feature (for cross-tree references)
     */
    resolveDependencyPath(features, depId, currentFeaturePath) {
        // Direct lookup first
        const directMatch = features.get(depId);
        if (directMatch)
            return directMatch;
        // Try to find the feature by featureId in paths
        for (const [path, featureInfo] of features.entries()) {
            if (path.includes(depId) || featureInfo.featureId === depId || featureInfo.featureName === depId) {
                return featureInfo;
            }
        }
        return undefined;
    }
    /**
     * 检查状态回退的警告 - 考虑交叉树依赖
     */
    async checkStateRollbackWarnings(featurePath, fromState, toState) {
        const features = await this.scanAllFeatures();
        const warnings = [];
        // 查找所有依赖当前 Feature 的其他 Feature
        for (const [otherPath, otherFeature] of features) {
            if (otherPath === featurePath)
                continue;
            // Check if this other feature depends on the current feature
            const dependsOnCurrent = otherFeature.dependencies.some(dep => dep === featurePath || dep === features.get(featurePath)?.featureId || dep.includes(featurePath.split('/').pop() || ''));
            if (dependsOnCurrent) {
                // 检查依赖者的状态是否高于目标状态
                if (this.isStateHigher(otherFeature.state, toState)) {
                    warnings.push(`Feature 路径 ${otherPath} 依赖此 Feature，` +
                        `且当前状态为 ${otherFeature.state}，回退状态 ${toState} 可能影响依赖项`);
                }
            }
        }
        return warnings;
    }
    /**
     * 检测循环依赖，覆盖嵌套结构
     */
    async detectCircularDependencies() {
        const features = await this.scanAllFeatures();
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const dfs = (featurePath, path) => {
            if (recursionStack.has(featurePath)) {
                // 发现循环
                const cycleStart = path.indexOf(featurePath);
                const cycle = path.slice(cycleStart);
                cycle.push(featurePath);
                cycles.push(cycle);
                return;
            }
            if (visited.has(featurePath))
                return;
            visited.add(featurePath);
            recursionStack.add(featurePath);
            path.push(featurePath);
            const feature = features.get(featurePath);
            if (feature) {
                for (const depPath of feature.dependencies) {
                    // Try to locate the true dependency path
                    let resolvedDepPath = features.get(depPath)?.featurePath || depPath;
                    if (!features.has(resolvedDepPath) && depPath !== resolvedDepPath) {
                        // Try alternative resolution methods
                        resolvedDepPath = depPath;
                    }
                    dfs(resolvedDepPath, [...path]);
                }
            }
            recursionStack.delete(featurePath);
        };
        for (const featurePath of features.keys()) {
            dfs(featurePath, []);
        }
        return cycles;
    }
    /**
     * 获取阻塞当前 Feature 的列表
     */
    async getBlockingFeatures(featurePath) {
        const features = await this.scanAllFeatures();
        const feature = features.get(featurePath);
        const blocking = [];
        if (!feature)
            return blocking;
        for (const depPath of feature.dependencies) {
            const resolvedDep = features.get(depPath) || this.tryMatchDepInTree(features, depPath, featurePath);
            if (resolvedDep) {
                blocking.push({
                    featureId: resolvedDep.featureId,
                    featureName: resolvedDep.featureName,
                    state: resolvedDep.state
                });
            }
        }
        return blocking;
    }
    /**
     * 获取被当前 Feature 阻塞的列表
     */
    async getBlockedByFeatures(featurePath) {
        const features = await this.scanAllFeatures();
        const blocked = [];
        for (const [otherPath, otherFeature] of features) {
            if (otherPath === featurePath)
                continue;
            // Check if other feature is blocked because current feature is in their dep list
            const isCurrentlyDependent = otherFeature.dependencies.some(dep => dep === featurePath || dep.includes(featurePath.split('/').pop() || ''));
            if (isCurrentlyDependent) {
                blocked.push({
                    featureId: otherFeature.featureId,
                    featureName: otherFeature.featureName,
                    state: otherFeature.state
                });
            }
        }
        return blocked;
    }
    /**
     * Map feature status to enum
     */
    mapStatusToState(status) {
        switch (status) {
            case 'planned': return 'planned';
            case 'tasked': return 'tasked';
            case 'building': return 'implementing';
            case 'reviewed': return 'reviewed';
            case 'validated': return 'validated';
            case 'specified': return 'specified';
            default: return 'specified'; // Default to specified
        }
    }
    /**
     * 辅助函数：检查状态是否就绪（≥ 目标状态）
     */
    isStateReady(currentState, targetState) {
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
        const currentOrder = stateOrder[currentState] ?? 0;
        const targetOrder = stateOrder[targetState] ?? 0;
        return currentOrder >= targetOrder;
    }
    /**
     * 辅助函数：检查状态是否更高
     */
    isStateHigher(state1, state2) {
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
        const order1 = stateOrder[state1] ?? 0;
        const order2 = stateOrder[state2] ?? 0;
        return order1 > order2;
    }
    /**
     * 获取依赖关系可视化数据
     */
    async getDependencyVisualization() {
        const features = await this.scanAllFeatures();
        const nodes = [];
        const edges = [];
        for (const [featurePath, feature] of features) {
            nodes.push({
                id: featurePath,
                label: `${feature.featureName} (${featurePath.split('/').pop()})`,
                state: feature.state
            });
            for (const depPath of feature.dependencies) {
                // Try to resolve the dependency path properly
                let resolvedDepPath = depPath;
                const depMatch = this.tryMatchDepInTree(features, depPath, featurePath);
                if (depMatch) {
                    resolvedDepPath = depMatch.featurePath;
                }
                // Add edge to dependency (from feature to its dependency)
                edges.push({
                    from: featurePath,
                    to: resolvedDepPath
                });
            }
        }
        return { nodes, edges };
    }
}
