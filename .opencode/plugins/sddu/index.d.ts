import { DiscoveryWorkflowEngine, CoachingLevel, CoachingConfig, CoachingModeEngine, DiscoveryStateValidator, DISCOVERY_WORKFLOW, DiscoveryConfig } from './discovery/workflow-engine';
import { StateMachine, DependencyChecker, StateLoader, FeatureStateEnum, FeatureState, TransitionResult, HistoryEntry, FeatureWithFullHistory, WorkflowStatus, PhaseHistory, validateState } from './state/machine';
import { ParentStateManager } from './state/parent-state-manager';
import { TreeStateValidator } from './state/tree-state-validator';
import { AutoUpdater } from './state/auto-updater';
import { migrateState, MigrationResult } from './state/migrator';
import { SdduMigrateSchemaCommand } from './commands/sddu-migrate-schema';
import { StateV2_0_0, StateV2_1_0 } from './state/schema-v2.0.0';
export declare const SDDUPlugin: ({ project, client, $, directory, worktree }: {
    project: any;
    client: any;
    $: any;
    directory: any;
    worktree: any;
}) => Promise<{
    tool: {
        sddu_update_state: any;
    };
    "session.created": (input: any) => Promise<void>;
    "file.edited": (input: any) => Promise<void>;
    "session.idle": (input: any) => Promise<void>;
    "session.end": (input: any) => Promise<void>;
}>;
export { DISCOVERY_WORKFLOW, DiscoveryWorkflowEngine, CoachingLevel, CoachingConfig, CoachingModeEngine, DiscoveryStateValidator, DiscoveryConfig, AutoUpdater, StateMachine, DependencyChecker, StateLoader, // New export for distributed state
ParentStateManager, // New export for parent feature management
TreeStateValidator, // New export for tree state validation
StateV2_0_0, StateV2_1_0, // New export for tree structure schema
WorkflowStatus, PhaseHistory, validateState, FeatureStateEnum, FeatureState, TransitionResult, HistoryEntry, FeatureWithFullHistory, SdduMigrateSchemaCommand, migrateState, MigrationResult, };
export default SDDUPlugin;
