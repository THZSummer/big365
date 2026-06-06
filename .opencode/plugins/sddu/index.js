// SDDU Plugin for OpenCode
// Specification: https://opencode.ai/docs/plugins/
// 统一导入使用新的类型定义系统
import { tool } from '@opencode-ai/plugin';
import { 
// Discovery 相关类型和类
DiscoveryWorkflowEngine, CoachingLevel, DiscoveryStateValidator, DISCOVERY_WORKFLOW, } from './discovery/workflow-engine';
// 重新导入状态相关类型和类
import { 
// 状态管理相关类和接口
StateMachine, DependencyChecker, StateLoader, validateState, } from './state/machine';
// Import Tree related functionality
import { ParentStateManager } from './state/parent-state-manager';
import { TreeStateValidator } from './state/tree-state-validator';
// 导入 AutoUpdater 
import { AutoUpdater } from './state/auto-updater';
import { 
// 迁移相关类和类型
migrateState, } from './state/migrator';
// 从命令模块导入
import { SdduMigrateSchemaCommand } from './commands/sddu-migrate-schema';
// 全局实例存储，以确保在会话生命周期内保持单例
let globalAutoUpdater = null;
let globalStateMachine = null;
export const SDDUPlugin = async ({ project, client, $, directory, worktree }) => {
    // Initialize StateMachine with the new distributed approach
    const stateMachine = new StateMachine(directory + '/.sddu/specs-tree-root'); // Updated to .sddu path for new structure
    // Initialize the dependency checker with updated state machine
    const dependencyChecker = new DependencyChecker(stateMachine, directory + '/.sddu/specs-tree-root');
    stateMachine.setDependencyChecker(dependencyChecker);
    // Initialize ParentStateManager for handling parent feature state updates
    const parentStateManager = new ParentStateManager();
    // Await state loading using distributed approach
    try {
        await stateMachine.load();
    }
    catch (error) {
        await client.app.log({
            body: {
                service: "sddu-plugin",
                level: "debug",
                message: "No existing states loaded, starting fresh",
                extra: { error: String(error) }
            }
        });
    }
    // Initialize AutoUpdater with the state machine
    const autoUpdater = new AutoUpdater(stateMachine);
    // Store as global instances for subsequent event access
    globalAutoUpdater = autoUpdater;
    globalStateMachine = stateMachine;
    // Enable auto-updater at startup
    autoUpdater.setEnabled(true);
    // Use official logging API
    await client.app.log({
        body: {
            service: "sddu-plugin",
            level: "info",
            message: "SDDU Plugin loaded with Tree Structure Optimization, Discovery Engine and AutoUpdater",
            extra: {
                directory: directory,
                project: project?.name,
                features: ["spec", "plan", "task", "build", "review", "validate", "discovery", "autoUpdater", "tree-structure"]
            }
        }
    });
    // Map agent-friendly status names to schema-valid status names
    const statusAliasMap = {
        'discovered': 'specified',
        'implementing': 'building',
        'building': 'building',
        'completed': 'validated',
        'specified': 'specified',
        'planned': 'planned',
        'tasked': 'tasked',
        'reviewed': 'reviewed',
        'validated': 'validated',
    };
    const statusToTransitionTarget = {
        'specified': 'specified',
        'planned': 'planned',
        'tasked': 'tasked',
        'building': 'implementing',
        'reviewed': 'reviewed',
        'validated': 'validated',
        'discovered': 'specified',
        'completed': 'validated',
    };
    return {
        tool: {
            sddu_update_state: tool({
                description: 'Update the state of a SDDU feature.',
                args: {
                    feature: tool.schema.string().describe('Feature path'),
                    status: tool.schema.string().describe('Target status'),
                    comment: tool.schema.string().optional(),
                    data: tool.schema.object({}).passthrough().optional(),
                },
                async execute(args, context) {
                    const { feature, status: rawStatus, comment, data } = args;
                    const inputStatus = rawStatus.toLowerCase().trim();
                    const mappedStatus = statusAliasMap[inputStatus];
                    if (!mappedStatus) {
                        return JSON.stringify({ success: false, error: 'Invalid status' });
                    }
                    try {
                        const transitionTarget = statusToTransitionTarget[mappedStatus];
                        const result = await stateMachine.updateState(feature, transitionTarget, data || {}, context.agent || 'sddu_update_state', comment || `Updated to ${mappedStatus}`);
                        return JSON.stringify({
                            success: true,
                            feature: result.feature,
                            status: result.status,
                            message: `Updated to ${mappedStatus}`
                        });
                    }
                    catch (error) {
                        return JSON.stringify({ success: false, error: error.message });
                    }
                }
            }),
        },
        // Listen for session creation
        "session.created": async (input) => {
            await client.app.log({
                body: {
                    service: "sddu-plugin",
                    level: "debug",
                    message: "Session created, initializing SDDU state",
                    extra: { directory: directory }
                }
            });
            // Initialize SDDU state
            if (globalAutoUpdater && globalStateMachine) {
                // Ensure AutoUpdater is active when session starts
                globalAutoUpdater.setEnabled(true);
            }
        },
        // Listen for file edits
        "file.edited": async (input) => {
            // Track spec file changes in both old and new structure paths
            if (input.filePath.includes(".sddu/specs-tree") || input.filePath.includes("specs-tree")) {
                await client.app.log({
                    body: {
                        service: "sddu-plugin",
                        level: "debug",
                        message: "Spec file edited, triggering auto-update check",
                        extra: { file: input.filePath }
                    }
                });
                // Trigger auto-update check
                if (globalAutoUpdater) {
                    globalAutoUpdater.triggerAutoUpdate(input.filePath);
                }
                // Check if this is a parent feature being edited and update accordingly
                if (globalStateMachine) {
                    // Determine if the file belongs to a potential parent node
                    try {
                        const featureDir = input.filePath.substring(0, input.filePath.lastIndexOf('/'));
                        const isParentFeature = await globalStateMachine.isParentFeature(featureDir);
                        if (isParentFeature) {
                            // If it's a parent feature, potentially update the aggregated state in parent feature
                            await client.app.log({
                                body: {
                                    service: "sddu-plugin",
                                    level: "debug",
                                    message: "Detected change in parent feature, considering parent state update",
                                    extra: { featureDir: featureDir }
                                }
                            });
                        }
                    }
                    catch (error) {
                        // Safe to ignore - may be just checking features in process
                        console.log('Info: Error checking parent state for file:', input.filePath);
                    }
                }
            }
        },
        // Listen for session idle events (simulated session.idle)
        "session.idle": async (input) => {
            await client.app.log({
                body: {
                    service: "sddu-plugin",
                    level: "debug",
                    message: "Session idle detected, running complete scan",
                    extra: { timestamp: new Date().toISOString() }
                }
            });
            // If autoUpdater is available, run full scan
            if (globalAutoUpdater) {
                try {
                    await globalAutoUpdater.scanAndAutoUpdate();
                    // For tree structure - if there are parent features, update their children information
                    if (globalStateMachine && parentStateManager) {
                        // Scan for any updated parent features and update their aggregated state
                        const allFeatures = await globalStateMachine.getAllFeatures();
                        for (const feature of allFeatures) {
                            try {
                                // Only run the parent state update for parent features, not individual leaf features
                                const isParent = await globalStateMachine.isParentFeature(feature.id);
                                if (isParent) {
                                    await client.app.log({
                                        body: {
                                            service: "sddu-plugin",
                                            level: "debug",
                                            message: `Updating parent feature state for: ${feature.id}`
                                        }
                                    });
                                    // Update parent state with current children information
                                    await parentStateManager.scanAndUpdateParentState(feature.id, new StateLoader(directory + '/.sddu/specs-tree-root'));
                                }
                            }
                            catch (error) {
                                await client.app.log({
                                    body: {
                                        service: "sddu-plugin",
                                        level: "warn",
                                        message: `Error checking parent state for: ${feature.id}`,
                                        extra: { error: String(error) }
                                    }
                                });
                            }
                        }
                    }
                    await client.app.log({
                        body: {
                            service: "sddu-plugin",
                            level: "debug",
                            message: "Session idle scan completed successfully"
                        }
                    });
                }
                catch (error) {
                    await client.app.log({
                        body: {
                            service: "sddu-plugin",
                            level: "error",
                            message: "Session idle scan failed",
                            extra: { error: error instanceof Error ? error.message : String(error) }
                        }
                    });
                }
            }
            else {
                await client.app.log({
                    body: {
                        service: "sddu-plugin",
                        level: "warn",
                        message: "AutoUpdater not initialized, skipping scan"
                    }
                });
            }
        },
        // Listen for session end, clean up resources
        "session.end": async (input) => {
            await client.app.log({
                body: {
                    service: "sddu-plugin",
                    level: "debug",
                    message: "Session ending, cleaning up resources",
                    extra: { timestamp: new Date().toISOString() }
                }
            });
            if (globalAutoUpdater) {
                globalAutoUpdater.dispose();
                globalAutoUpdater = null;
            }
            globalStateMachine = null;
        }
    };
};
// 导出所有公共 API
export { 
// Discovery
DISCOVERY_WORKFLOW, DiscoveryWorkflowEngine, CoachingLevel, DiscoveryStateValidator, 
// State Management
AutoUpdater, StateMachine, DependencyChecker, StateLoader, // New export for distributed state
ParentStateManager, // New export for parent feature management
TreeStateValidator, validateState, 
// Migration  
SdduMigrateSchemaCommand, migrateState, };
export default SDDUPlugin;
