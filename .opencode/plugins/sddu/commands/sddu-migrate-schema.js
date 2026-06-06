// Schema 迁移命令
// 提供 CLI 接口执行 State Schema v1.x → v2.0.0 迁移
import * as fs from 'fs/promises';
import * as path from 'path';
import { migrateState } from '../state/migrator';
/**
 * Schema 迁移命令类
 */
export class SdduMigrateSchemaCommand {
    specsDir;
    constructor(specsDir = 'specs-tree-root') {
        this.specsDir = specsDir;
    }
    /**
     * 执行迁移命令
     */
    async execute(options) {
        const report = {
            total: 0,
            success: 0,
            failed: 0,
            skipped: 0,
            results: []
        };
        let featuresToMigrate = [];
        // 确定要迁移的 Features
        if (options.feature) {
            featuresToMigrate = [options.feature];
        }
        else if (options.all) {
            featuresToMigrate = await this.getAllFeatures();
        }
        else {
            console.error('❌ 错误：必须指定 --feature 或 --all 参数');
            return report;
        }
        report.total = featuresToMigrate.length;
        if (report.total === 0) {
            console.log('ℹ️  没有找到需要迁移的 Features');
            return report;
        }
        console.log(`📦 开始迁移 ${report.total} 个 Feature(s)${options.dryRun ? ' (预演模式)' : ''}`);
        console.log('');
        // 逐个迁移
        for (const featureId of featuresToMigrate) {
            const result = await this.migrateFeature(featureId, options);
            report.results.push(result);
            if (result.success) {
                report.success++;
            }
            else if (result.message?.includes('无需迁移')) {
                report.skipped++;
            }
            else {
                report.failed++;
            }
        }
        // 输出报告
        this.printReport(report);
        return report;
    }
    /**
     * 迁移单个 Feature
     */
    async migrateFeature(featureId, options) {
        const featureDir = path.join(this.specsDir, featureId);
        const stateFile = path.join(featureDir, 'state.json');
        try {
            // 检查 Feature 目录是否存在
            try {
                await fs.access(featureDir);
            }
            catch {
                return {
                    featureId,
                    success: false,
                    message: 'Feature 目录不存在'
                };
            }
            // 读取状态文件
            let stateContent;
            try {
                stateContent = await fs.readFile(stateFile, 'utf-8');
            }
            catch {
                return {
                    featureId,
                    success: false,
                    message: 'state.json 文件不存在'
                };
            }
            const state = JSON.parse(stateContent);
            // 检查是否需要迁移
            if (state.version === '2.0.0') {
                return {
                    featureId,
                    success: true,
                    message: '已是 v2.0.0，无需迁移'
                };
            }
            console.log(`🔄 迁移 Feature: ${featureId} (v${state.version || 'unknown'} → v2.0.0)`);
            if (options.dryRun) {
                console.log(`  ⏭️  预演模式：跳过实际迁移`);
                return {
                    featureId,
                    success: true,
                    message: `预演：将从 v${state.version || 'unknown'} 迁移到 v2.0.0`
                };
            }
            // 执行迁移
            const migrationResult = await migrateState(state, featureId, this.specsDir);
            if (migrationResult.success) {
                // 写入新的状态文件
                const newState = migrateToV2Wrapper(state);
                await fs.writeFile(stateFile, JSON.stringify(newState, null, 2), 'utf-8');
                console.log(`  ✅ 迁移成功`);
                if (migrationResult.backupPath && options.backup !== false) {
                    console.log(`  💾 备份：${migrationResult.backupPath}`);
                }
                return {
                    featureId,
                    success: true,
                    message: `成功迁移到 v2.0.0`,
                    backupPath: migrationResult.backupPath
                };
            }
            else {
                console.log(`  ❌ 迁移失败：${migrationResult.error}`);
                return {
                    featureId,
                    success: false,
                    error: migrationResult.error
                };
            }
        }
        catch (error) {
            console.log(`  ❌ 错误：${error.message}`);
            return {
                featureId,
                success: false,
                error: error.message
            };
        }
    }
    /**
     * 获取所有 Features
     */
    async getAllFeatures() {
        try {
            const specsDirPath = path.join(this.specsDir);
            const items = await fs.readdir(specsDirPath, { withFileTypes: true });
            return items
                .filter(item => item.isDirectory() && !item.name.startsWith('.'))
                .map(item => item.name);
        }
        catch (error) {
            console.error('获取 Features 列表失败:', error);
            return [];
        }
    }
    /**
     * 打印迁移报告
     */
    printReport(report) {
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('         Schema 迁移报告');
        console.log('═══════════════════════════════════════════');
        console.log(`总计：  ${report.total}`);
        console.log(`成功：  ${report.success}`);
        console.log(`失败：  ${report.failed}`);
        console.log(`跳过：  ${report.skipped}`);
        console.log('═══════════════════════════════════════════');
        if (report.failed > 0) {
            console.log('');
            console.log('失败的 Features:');
            for (const result of report.results) {
                if (!result.success && !result.message?.includes('无需迁移')) {
                    console.log(`  - ${result.featureId}: ${result.error || result.message}`);
                }
            }
        }
        console.log('');
    }
}
/**
 * Wrapper function to call migrateToV2 from migrator.ts
 * This is needed because migrateToV2 is not exported
 */
function migrateToV2Wrapper(oldState) {
    const now = new Date().toISOString();
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
    const phaseHistory = [];
    if (oldState.phaseHistory && Array.isArray(oldState.phaseHistory)) {
        phaseHistory.push(...oldState.phaseHistory);
    }
    else if (oldState.history && Array.isArray(oldState.history)) {
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
// CLI 入口函数
export async function runMigrateCommand(args) {
    const options = {
        dryRun: args.includes('--dry-run'),
        backup: !args.includes('--no-backup'),
        specsDir: 'specs-tree-root'
    };
    // 解析参数
    const featureIndex = args.indexOf('--feature');
    if (featureIndex !== -1 && args[featureIndex + 1]) {
        options.feature = args[featureIndex + 1];
    }
    if (args.includes('--all')) {
        options.all = true;
    }
    const command = new SdduMigrateSchemaCommand(options.specsDir);
    await command.execute(options);
}
