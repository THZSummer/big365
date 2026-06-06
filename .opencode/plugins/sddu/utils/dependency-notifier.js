/**
 * 依赖就绪通知工具
 * 实现多子 Feature 场景下的依赖通知机制
 */
/**
 * 创建默认配置
 */
export function createDefaultConfig() {
    return {
        enabled: true,
        logToConsole: true,
        onDependencyReady: (subFeatureId, readyFor) => {
            const message = `📢 子 Feature "${subFeatureId}" 的依赖已就绪，可以开始开发: ${readyFor.join(', ')}`;
            if (console && console.log) {
                console.log(message);
            }
            else {
                // 降级处理：尝试其他输出方式
                if (typeof process !== 'undefined' && process.stdout) {
                    process.stdout.write(message + '\n');
                }
                else {
                    // 浏览器环境可能无法输出，忽略
                }
            }
        }
    };
}
/**
 * 检查特定子特性是否已满足所有依赖条件
 * @param subFeatureId 要检查的子特性ID
 * @param dependencies 依赖关系映射：subFeatureId -> 依赖的其他子特性列表
 * @param subFeatureStates 子特性的状态映射
 * @returns 是否满足依赖条件
 */
export function isDependencyReady(subFeatureId, dependencies, subFeatureStates) {
    // 获取该子特性的依赖列表
    const deps = dependencies[subFeatureId] || [];
    // 如果没有依赖，则总是就绪
    if (deps.length === 0)
        return true;
    // 检查所有依赖的子特性是否都达到了指定阶段状态
    // 通常要求达到 planning 完成阶段（phase >= 2）才能开始实现
    return deps.every(depId => {
        const depState = subFeatureStates.get(depId);
        // 只有当依赖项存在且其阶段 >= 2 （已完成规划）时才是就绪的
        return depState && depState.phase >= 2; // 0=spec, 1=plan, 2=task, 3=build, 4=review, 5=validate
    });
}
/**
 * 找到所有依赖于指定子特性的其他子特性
 * @param completedSubFeatureId 已完成的子特性ID
 * @param dependencies 依赖关系映射：subFeatureId -> 依赖的其他子特性列表
 * @returns 依赖于指定子特性的子特性ID数组
 */
export function findDependentSubFeatures(completedSubFeatureId, dependencies) {
    return Object.entries(dependencies)
        .filter(([subFeatureId, deps]) => deps.includes(completedSubFeatureId))
        .map(([subFeatureId, _]) => subFeatureId);
}
/**
 * 通知依赖已就绪
 * 当一个子特性状态发生变更时，检查哪些其他子特性的依赖条件已经满足
 * @param completedSubFeatureId 完成的子特性ID
 * @param dependencies 依赖关系映射
 * @param subFeatureStates 所有子特性的状态
 * @param config 不可配置项
 * @returns 通知结果
 */
export async function notifyDependencyReady(completedSubFeatureId, dependencies, subFeatureStates, config) {
    const effectiveConfig = { ...createDefaultConfig(), ...config };
    // 如果禁用了通知，直接返回
    if (!effectiveConfig.enabled) {
        return {
            notified: false,
            readySubFeatures: []
        };
    }
    // 找到依赖于这个已完成的子特性的其他所有子特性的列表
    const dependentSubFeatures = findDependentSubFeatures(completedSubFeatureId, dependencies);
    if (dependentSubFeatures.length === 0) {
        // 没有其他子特性依赖这个已完成的特性
        return {
            notified: false,
            readySubFeatures: [],
            message: `没有其他子特性依赖 "${completedSubFeatureId}"`
        };
    }
    const actuallyReadySubFeatures = [];
    // 检查每个依赖它的子特性是否现在可以开始了
    for (const dependentSubFeatureId of dependentSubFeatures) {
        if (isDependencyReady(dependentSubFeatureId, dependencies, subFeatureStates)) {
            // 这个dependentSubFeature的所有依赖项现在都就绪了
            actuallyReadySubFeatures.push(dependentSubFeatureId);
            // 针对此就绪的子特性调用配置的回调函数
            if (effectiveConfig.onDependencyReady) {
                // 获取该子特性依赖的其他子特性状态（这些就是现在可用的依赖）
                const availableDependencies = (dependencies[dependentSubFeatureId] || [])
                    .filter(req => {
                    const reqState = subFeatureStates.get(req);
                    return reqState && reqState.phase >= 2;
                });
                effectiveConfig.onDependencyReady(dependentSubFeatureId, availableDependencies);
            }
        }
    }
    // 如果我们通知了某些子特性的就绪
    if (actuallyReadySubFeatures.length > 0) {
        const message = `通知: ${actuallyReadySubFeatures.length} 个子特性依赖 "${completedSubFeatureId}" 的依赖已就绪`;
        if (effectiveConfig.logToConsole && effectiveConfig.onDependencyReady === createDefaultConfig().onDependencyReady) {
            // 默认日志功能已经在 onDependencyReady 中实现了
        }
        return {
            notified: true,
            readySubFeatures: actuallyReadySubFeatures,
            message
        };
    }
    return {
        notified: false,
        readySubFeatures: [],
        message: `虽然 "${completedSubFeatureId}" 已完成，但没有其他依赖它的子特性达到就绪状态`
    };
}
