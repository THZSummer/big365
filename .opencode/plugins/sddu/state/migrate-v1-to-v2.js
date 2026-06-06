// Migration utility from v1.2.11 to v2.0.0
// Provides state schema evolution support
import { validateState } from './schema-v2.0.0';
/**
 * Maps legacy status values to new workflow status values (for migration purposes)
 */
const mapLegacyStatus = (legacyStatus) => {
    // Simple mapping logic - extendable for complex status mappings
    switch (legacyStatus.toLowerCase()) {
        case 'initiated':
        case 'draft':
        case 'created':
            return 'specified';
        case 'planning':
        case 'designed':
            return 'planned';
        case 'inprogress':
        case 'active':
            return 'building';
        case 'completed':
        case 'finished':
            return 'validated';
        default:
            return legacyStatus; // Pass through unknown status values
    }
};
/**
 * Migrates legacy state schema (v1.2.11) to new schema (v2.0.0)
 * @param legacyState State object in v1.2.11 format
 * @returns State object in v2.0.0 format
 */
export function migrateFromV1_2_11(legacyState) {
    // Convert legacy state to new format
    const newState = {
        feature: legacyState.featureId, // Changed from featureId to feature
        name: legacyState.name,
        version: 'v2.0.0',
        status: mapLegacyStatus(legacyState.status), // Cast since we're mapping legacy
        phase: legacyState.phase,
        phaseHistory: [
            {
                phase: legacyState.phase,
                status: mapLegacyStatus(legacyState.status), // Same cast
                timestamp: legacyState.lastUpdated,
                triggeredBy: 'migration-tool',
                comment: `Migrated from legacy status: ${legacyState.status}`
            }
        ],
        files: {
            spec: legacyState.specPath || `.sdd/${legacyState.featureId}/spec.md`,
            plan: legacyState.planPath
        },
        dependencies: {
            on: legacyState.dependencies || [],
            blocking: []
        },
        metadata: {
            featureId: legacyState.featureId,
            createdAt: legacyState.lastUpdated,
            updatedAt: new Date().toISOString(),
            priority: 'P1' // Default priority during migration
        },
        history: [
            {
                timestamp: legacyState.lastUpdated,
                from: undefined,
                to: mapLegacyStatus(legacyState.status),
                triggeredBy: 'migration-tool',
                comment: 'Initial migration from v1.2.11 to v2.0.0',
                version: 'v1.2.11-to-v2.0.0'
            }
        ]
    };
    // Validate the migrated state before returning
    if (!validateState(newState)) {
        throw new Error('Migrated state validation failed');
    }
    return newState;
}
/**
 * Checks if an object might be a legacy state (v1.2.11)
 * @param obj Unknown object to check
 * @returns True if object appears to be legacy state
 */
export function isLegacyState(obj) {
    return (obj &&
        typeof obj === 'object' &&
        'featureId' in obj && // Legacy property (not 'feature')
        'status' in obj &&
        'lastUpdated' in obj &&
        !('phaseHistory' in obj) // New property not in legacy version
    );
}
