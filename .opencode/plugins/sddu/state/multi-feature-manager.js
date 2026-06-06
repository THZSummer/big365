/**
 * 聚合子 Feature 状态计算 Feature 整体状态
 * 规则：Feature 状态 = 最慢子 Feature 的状态
 */
export function aggregateFeatureState(subFeatures) {
    if (subFeatures.length === 0)
        return 'specified';
    const statusOrder = [
        'specified', 'planned', 'tasked', 'implementing', 'reviewed', 'validated', 'completed'
    ];
    let slowestStatus = subFeatures[0].status;
    for (const sf of subFeatures) {
        if (statusOrder.indexOf(sf.status) < statusOrder.indexOf(slowestStatus)) {
            slowestStatus = sf.status;
        }
    }
    return slowestStatus;
}
/**
 * 构建依赖关系图，包含直接依赖和被阻塞关系
 */
export function buildDependencyGraph(subFeatures, dependencies) {
    const graph = {
        dependencies: {},
        blockedBy: {}
    };
    // 初始化所有子 Feature 在依赖图中
    for (const subFeature of subFeatures) {
        graph.dependencies[subFeature.id] = dependencies[subFeature.id] || [];
        graph.blockedBy[subFeature.id] = [];
    }
    // 计算被阻塞关系（blockedBy）
    for (const sourceId in graph.dependencies) {
        const deps = graph.dependencies[sourceId];
        for (const depId of deps) {
            if (graph.blockedBy[depId]) {
                graph.blockedBy[depId].push(sourceId);
            }
        }
    }
    return graph;
}
/**
 * 循环依赖检测 (DFS)
 */
export function detectCircularDependency(subFeatureId, dependencies, visited = new Set(), path = []) {
    if (path.includes(subFeatureId)) {
        return [...path, subFeatureId]; // 返回循环路径
    }
    if (visited.has(subFeatureId))
        return null;
    visited.add(subFeatureId);
    path.push(subFeatureId);
    if (dependencies[subFeatureId]) {
        for (const dep of dependencies[subFeatureId]) {
            const cycle = detectCircularDependency(dep, dependencies, visited, [...path]);
            if (cycle)
                return cycle;
        }
    }
    return null;
}
/**
 * 检查子 Feature 是否其依赖已完成（至少是 planned 状态）
 */
export function isDependencyReady(subFeatureId, dependencyGraph, subFeatureStates) {
    const deps = dependencyGraph.dependencies[subFeatureId] || [];
    if (deps.length === 0)
        return true;
    // 检查所有依赖子 Feature 是否至少是 planned 状态
    return deps.every(depId => {
        const depState = subFeatureStates.get(depId);
        return depState && isFeatureAtLeastPlanned(depState.status);
    });
}
/**
 * 辅助函数：检查功能状态是否至少为 planned
 */
function isFeatureAtLeastPlanned(status) {
    const plannedOrLater = ['planned', 'tasked', 'implementing', 'reviewed', 'validated', 'completed'];
    return plannedOrLater.includes(status);
}
/**
 * 获取所有可并行执行的子 Feature 列表（依赖已就绪且不在阻塞中的）
 */
export function getReadySubFeatures(dependencyGraph, subFeatureStates) {
    const readyFeatures = [];
    // 使用 keys() 方法获取键迭代器，然后转换为数组以避免 TypeScript 循环错误
    const keys = Array.from(subFeatureStates.keys());
    for (const subFeatureId of keys) {
        // 检查是否依赖已就绪
        const dependenciesReady = isDependencyReady(subFeatureId, dependencyGraph, subFeatureStates);
        // 检查是否被其他子 Feature 阻塞（依赖这个Feature的子Feature还没到planned状态）
        const isBlocked = isCurrentlyBlocked(subFeatureId, dependencyGraph, subFeatureStates);
        if (dependenciesReady && !isBlocked) {
            readyFeatures.push(subFeatureId);
        }
    }
    return readyFeatures;
}
/**
 * 检查一个子Feature是否被其他没有planned的依赖当前feature的子Feature阻塞
 */
function isCurrentlyBlocked(subFeatureId, dependencyGraph, subFeatureStates) {
    const blockers = dependencyGraph.blockedBy[subFeatureId] || [];
    for (const blockerId of blockers) {
        const blockerState = subFeatureStates.get(blockerId);
        // 如果阻塞者还未到达规划状态，则认为是阻塞
        if (blockerState && !isFeatureAtLeastPlanned(blockerState.status)) {
            return true;
        }
    }
    return false;
}
