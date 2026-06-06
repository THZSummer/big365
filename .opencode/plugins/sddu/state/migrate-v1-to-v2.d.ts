import { StateV2_0_0 } from './schema-v2.0.0';
/**
 * Represents legacy state schema v1.2.11 format (for migration purposes)
 */
interface LegacyStateV1_2_11 {
    featureId: string;
    name?: string;
    status: string;
    phase: number;
    progress: number;
    specPath?: string;
    planPath?: string;
    lastUpdated: string;
    dependencies?: string[];
}
/**
 * Migrates legacy state schema (v1.2.11) to new schema (v2.0.0)
 * @param legacyState State object in v1.2.11 format
 * @returns State object in v2.0.0 format
 */
export declare function migrateFromV1_2_11(legacyState: LegacyStateV1_2_11): StateV2_0_0;
/**
 * Checks if an object might be a legacy state (v1.2.11)
 * @param obj Unknown object to check
 * @returns True if object appears to be legacy state
 */
export declare function isLegacyState(obj: any): boolean;
export { LegacyStateV1_2_11 };
