/**
 * 验证 State 对象是否符合 v1.2.5 Schema
 */
export function validateState(state) {
    const errors = [];
    // 必需字段验证
    if (!state || typeof state !== 'object') {
        return { valid: false, errors: ['State must be an object'] };
    }
    if (typeof state.feature !== 'string') {
        errors.push('feature must be a string');
    }
    if (state.version !== '1.2.5') {
        errors.push('version must be "1.2.5"');
    }
    const allowedStatuses = ['drafting', 'discovered', 'specified', 'planned', 'tasked', 'implementing', 'reviewed', 'validated', 'completed'];
    if (!allowedStatuses.includes(state.status)) {
        errors.push(`status must be one of: ${allowedStatuses.join(', ')}`);
    }
    // 验证 phase 如果提供的话
    if (state.phase !== undefined && (typeof state.phase !== 'number' || state.phase < 1 || state.phase > 6)) {
        errors.push('phase must be a number between 1 and 6 if provided');
    }
    // 验证 mode 如果提供的话
    if (state.mode !== undefined && state.mode !== 'single' && state.mode !== 'multi') {
        errors.push('mode must be either "single" or "multi" if provided');
    }
    // 验证 files 对象如果提供的话
    if (state.files !== undefined) {
        if (typeof state.files !== 'object') {
            errors.push('files must be an object if provided');
        }
        else {
            if (state.files.spec !== undefined && typeof state.files.spec !== 'string') {
                errors.push('files.spec must be a string if provided');
            }
            if (state.files.plan !== undefined && typeof state.files.plan !== 'string') {
                errors.push('files.plan must be a string if provided');
            }
            if (state.files.tasks !== undefined && typeof state.files.tasks !== 'string') {
                errors.push('files.tasks must be a string if provided');
            }
            if (state.files.readme !== undefined && typeof state.files.readme !== 'string') {
                errors.push('files.readme must be a string if provided');
            }
        }
    }
    // 验证 dependencies 对象如果提供的话
    if (state.dependencies !== undefined) {
        if (typeof state.dependencies !== 'object') {
            errors.push('dependencies must be an object if provided');
        }
        else {
            if (state.dependencies.on !== undefined && !Array.isArray(state.dependencies.on)) {
                errors.push('dependencies.on must be an array if provided');
            }
            else if (Array.isArray(state.dependencies.on)) {
                for (let i = 0; i < state.dependencies.on.length; i++) {
                    if (typeof state.dependencies.on[i] !== 'string') {
                        errors.push(`dependencies.on[${i}] must be a string`);
                    }
                }
            }
            if (state.dependencies.blocking !== undefined && !Array.isArray(state.dependencies.blocking)) {
                errors.push('dependencies.blocking must be an array if provided');
            }
            else if (Array.isArray(state.dependencies.blocking)) {
                for (let i = 0; i < state.dependencies.blocking.length; i++) {
                    if (typeof state.dependencies.blocking[i] !== 'string') {
                        errors.push(`dependencies.blocking[${i}] must be a string`);
                    }
                }
            }
        }
    }
    // 验证 subFeatures 数组如果提供的话
    if (Array.isArray(state.subFeatures)) {
        for (let i = 0; i < state.subFeatures.length; i++) {
            const subFeat = state.subFeatures[i];
            if (typeof subFeat !== 'object') {
                errors.push(`subFeatures[${i}] must be an object`);
            }
            else {
                if (!subFeat.id || typeof subFeat.id !== 'string') {
                    errors.push(`subFeatures[${i}].id must be a non-empty string`);
                }
                if (!subFeat.dir || typeof subFeat.dir !== 'string') {
                    errors.push(`subFeatures[${i}].dir must be a non-empty string`);
                }
                if (!subFeat.status || !allowedStatuses.includes(subFeat.status)) {
                    errors.push(`subFeatures[${i}].status must be one of: ${allowedStatuses.join(', ')}`);
                }
                if (!subFeat.stateFile || typeof subFeat.stateFile !== 'string') {
                    errors.push(`subFeatures[${i}].stateFile must be a non-empty string`);
                }
                // 如果提供了 name、assignee，验证它们是字符串
                if (subFeat.name !== undefined && typeof subFeat.name !== 'string') {
                    errors.push(`subFeatures[${i}].name must be a string if provided`);
                }
                if (subFeat.assignee !== undefined && typeof subFeat.assignee !== 'string') {
                    errors.push(`subFeatures[${i}].assignee must be a string if provided`);
                }
            }
        }
    }
    // 验证 assignee 如果提供的话
    if (state.assignee !== undefined && typeof state.assignee !== 'string') {
        errors.push('assignee must be a string if provided');
    }
    // 验证 createdAt 和 updatedAt 如果提供的话
    if (state.createdAt !== undefined && typeof state.createdAt !== 'string') {
        errors.push('createdAt must be a string if provided');
    }
    if (state.updatedAt !== undefined && typeof state.updatedAt !== 'string') {
        errors.push('updatedAt must be a string if provided');
    }
    return { valid: errors.length === 0, errors };
}
/**
 * 检查是否为多子 Feature 模式
 */
export function isMultiMode(state) {
    return state.mode === 'multi' && Array.isArray(state.subFeatures) && state.subFeatures.length > 0;
}
/**
 * 创建初始状态对象
 */
export function createInitialState(feature, name) {
    const now = new Date().toISOString();
    return {
        feature,
        name: name || undefined,
        version: '1.2.5',
        status: 'drafting',
        mode: 'multi', // 默认值
        files: {
            spec: `specs-tree-root/${feature}/spec.md`,
            plan: `specs-tree-root/${feature}/plan.md`,
            tasks: `specs-tree-root/${feature}/tasks.md`,
            readme: `specs-tree-root/${feature}/README.md`
        },
        dependencies: {
            on: [],
            blocking: []
        },
        subFeatures: [],
        createdAt: now,
        updatedAt: now
    };
}
