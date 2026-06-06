import fs from 'fs/promises';
import path from 'path';
/**
 * 检测状态版本，判断是否需要迁移
 * @param state 旧状态对象
 * @returns true 如果需要迁移，false 如果已经是最新版本
 */
function needsMigration(state) {
    const version = state.version;
    if (!version)
        return true; // 没有版本号，默认需要迁移到最新的
    // 如果已经是 v2.0.0，不需要迁移
    if (version === '2.0.0')
        return false;
    // 比较版本号：检查是否小于 2.0.0
    const [major1, minor1, patch1] = version.split('.').map(Number);
    const [major2, minor2, patch2] = '2.0.0'.split('.').map(Number);
    if (major1 < major2)
        return true;
    if (major1 === major2 && minor1 < minor2)
        return true;
    if (major1 === major2 && minor1 === minor2 && patch1 < patch2)
        return true;
    return false;
}
/**
 * 从 v1.2.5/v1.2.11 版本迁移状态到 v2.0.0 版本
 * 将旧格式转换为新的 State Schema v2.0.0
 * @param oldState 原来的状态对象
 * @returns 迁移后的新状态对象
 */
export function migrateToV2(oldState) {
    const now = new Date().toISOString();
    // 将旧状态字段映射到新 Schema
    const workflowStatusMap = {
        'specified': 'specified',
        'planned': 'planned',
        'tasked': 'tasked',
        'implementing': 'building',
        'reviewed': 'reviewed',
        'validated': 'validated',
        'completed': 'validated',
        'drafting': 'specified',
        'discovered': 'specified'
    };
    const status = workflowStatusMap[oldState.status] || 'specified';
    const phase = statusToPhase(status);
    // 迁移历史记录
    const phaseHistory = [];
    if (oldState.phaseHistory && Array.isArray(oldState.phaseHistory)) {
        phaseHistory.push(...oldState.phaseHistory);
    }
    else if (oldState.history && Array.isArray(oldState.history)) {
        // 尝试从旧历史记录中转换
        for (const h of oldState.history) {
            if (h.phase && h.status) {
                phaseHistory.push({
                    phase: h.phase,
                    status: h.status,
                    timestamp: h.timestamp || now,
                    triggeredBy: h.triggeredBy || 'unknown',
                    comment: h.comment
                });
            }
        }
    }
    // 如果没有 phaseHistory，创建初始条目
    if (phaseHistory.length === 0) {
        phaseHistory.push({
            phase,
            status,
            timestamp: oldState.createdAt || now,
            triggeredBy: 'migration',
            comment: 'Migrated to v2.0.0'
        });
    }
    return {
        feature: oldState.feature || oldState.id || 'unknown',
        name: oldState.name || oldState.feature || 'Unknown Feature',
        version: '2.0.0',
        status,
        phase,
        phaseHistory,
        files: {
            spec: oldState.files?.spec || 'spec.md',
            plan: oldState.files?.plan || undefined,
            tasks: oldState.files?.tasks || undefined,
            readme: oldState.files?.readme || undefined,
            review: oldState.files?.review || undefined,
            validation: oldState.files?.validation || undefined
        },
        dependencies: {
            on: oldState.dependencies?.on || [],
            blocking: oldState.dependencies?.blocking || []
        },
        metadata: {
            priority: oldState.metadata?.priority || oldState.priority,
            featureId: oldState.feature || oldState.id,
            createdAt: oldState.createdAt || now,
            updatedAt: now
        },
        history: oldState.history || []
    };
}
/**
 * 辅助函数：根据状态推断 phase
 */
function statusToPhase(status) {
    const phaseMap = {
        'specified': 1,
        'planned': 2,
        'tasked': 3,
        'building': 4,
        'reviewed': 5,
        'validated': 6
    };
    return phaseMap[status] || 1;
}
/**
 * 创建状态迁移备份
 * 迁移前自动备份原始状态
 * @param state 要备份的状态
 * @param featureId 主 feature ID
 * @param specsDir specs 目录路径
 * @returns 备份文件的路径
 */
export async function backupState(state, featureId, specsDir) {
    // 确保备份目录存在
    const backupDir = path.join(specsDir, '.state.backup');
    await fs.mkdir(backupDir, { recursive: true });
    // 生成备份文件名，格式为 state-YYYYMMDD-HHMMSS.json
    const timestamp = new Date().toISOString()
        .replace(/[-:]/g, '') // 移除破折号和冒号
        .replace(/\.\d{3}/, '') // 移除毫秒
        .substring(0, 15); // 截取到 HHMMSS 格式
    const backupFilename = `state-${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFilename);
    // 写入备份
    await fs.writeFile(backupPath, JSON.stringify(state, null, 2));
    console.log(`📊 状态备份已创建: ${backupPath}`);
    return backupPath;
}
/**
 * 将状态回滚到备份文件
 * @param featureId 主 feature ID
 * @param specsDir specs 目录路径
 * @param backupPath 备份文件路径（如果不提供，则尝试找回最新的备份）
 * @returns 回滚后的状态
 */
export async function rollbackState(featureId, specsDir, backupPath) {
    let backupToUse = backupPath;
    // 如果没有明确提供备份路径，尝试搜索最近的备份
    if (!backupToUse) {
        const backupDir = path.join(specsDir, '.state.backup');
        try {
            const files = await fs.readdir(backupDir);
            const jsonFiles = files
                .filter(f => f.startsWith('state-') && f.endsWith('.json'))
                .sort() // 按时间排序（因为我们按时间戳命名备份文件）
                .reverse(); // 最新的在前面
            if (jsonFiles.length > 0) {
                backupToUse = path.join(backupDir, jsonFiles[0]);
                console.log(`🔄 使用最新备份进行回滚: ${backupToUse}`);
            }
            else {
                throw new Error('未找到任何备份文件');
            }
        }
        catch (error) {
            throw new Error(`无法回滚: 未找到备份目录 ${backupDir}`);
        }
    }
    else {
        console.log(`🔄 使用指定备份进行回滚: ${backupToUse}`);
    }
    // 检查备份文件是否存在
    try {
        await fs.access(backupToUse);
    }
    catch (error) {
        throw new Error(`备份文件不存在: ${backupToUse}`);
    }
    // 读取备份内容并返回
    const backupContent = await fs.readFile(backupToUse, 'utf-8');
    const restoredState = JSON.parse(backupContent);
    console.log('✅ 状态已成功回滚至备份');
    return restoredState;
}
/**
 * 执行状态迁移
 * 自动检测旧格式状态，执行必要的迁移，并在必要时创建备份和提供回滚能力
 * @param oldState 原有的状态对象
 * @param featureId 主 feature ID
 * @param specsDir specs 目录路径
 * @returns 迁移结果
 */
export async function migrateState(oldState, featureId, specsDir) {
    console.log(`🔄 开始迁移状态：${featureId}`);
    try {
        // 检测是否需要迁移
        if (!needsMigration(oldState)) {
            console.log('✅ 状态已是最新版本 (v2.0.0)，无需迁移');
            return {
                success: true,
                migratedToVersion: oldState.version
            };
        }
        console.log(`🔧 检测到需要迁移的状态 - 当前版本：${oldState.version || '未指定'}`);
        // 迁移前创建备份
        const backupPath = await backupState(oldState, featureId, specsDir);
        // 执行迁移逻辑
        let newState;
        const currentVersion = oldState.version || '1.0.0';
        console.log(`📈 执行 ${currentVersion} → v2.0.0 迁移逻辑`);
        newState = migrateToV2(oldState);
        // 验证迁移结果的基本结构
        if (!newState.version || newState.version !== '2.0.0') {
            throw new Error('迁移失败：结果状态版本号错误');
        }
        if (!newState.feature) {
            throw new Error('迁移失败：结果状态缺少 feature 字段');
        }
        if (!newState.phaseHistory || !Array.isArray(newState.phaseHistory)) {
            throw new Error('迁移失败：结果状态缺少 phaseHistory 字段');
        }
        console.log('✅ 状态迁移成功：v2.0.0');
        return {
            success: true,
            backupPath: backupPath,
            migratedToVersion: '2.0.0'
        };
    }
    catch (error) {
        console.error('❌ 状态迁移失败:', error instanceof Error ? error.message : String(error));
        // 迁移失败，但记录错误信息
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
/**
 * 检查是否存在备份文件
 * @param specsDir specs 目录路径
 * @returns 是否存在备份
 */
export async function hasBackup(specsDir) {
    const backupDir = path.join(specsDir, '.state.backup');
    try {
        await fs.access(backupDir);
        const files = await fs.readdir(backupDir);
        return files.some(f => f.startsWith('state-') && f.endsWith('.json'));
    }
    catch (error) {
        return false;
    }
}
