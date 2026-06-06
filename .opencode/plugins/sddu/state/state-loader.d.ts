import { scanTreeStructure } from './tree-scanner';
import { StateV2_1_0 } from './schema-v2.0.0';
export declare class StateLoader {
    private cache;
    private cacheExpiryMs;
    private readonly specRootDir;
    constructor(specRootDir?: string);
    /**
     * Loads all distributed states using the tree scanner
     * Returns a Map where keys are feature paths and values are their states
     */
    loadAll(): Promise<Map<string, StateV2_1_0>>;
    /**
     * Gets the state for a specific feature
     * Uses cache with 3-second expiry
     * - Applies automatic fixes for common schema issues (EC-012, EC-013, EC-014)
     */
    get(featurePath: string): Promise<StateV2_1_0 | null>;
    private stateHasIssues;
    private applyReparation;
    /**
     * Sets the state for a specific feature
     * Updates cache and writes to the distributed file
     */
    set(featurePath: string, state: StateV2_1_0): Promise<boolean>;
    /**
     * Creates a new state for a given feature if it doesn't already exist
     * - Automatically calculates depth based on featurePath (FR-101)
     * - Initializes phaseHistory with consistent strategy (FR-101)
     * - Sets createdAt and updatedAt timestamps (FR-101)
     * - Calls TreeStateValidator for final validation and auto-fixing (FR-103)
     */
    create(featurePath: string, initialState: Partial<StateV2_1_0>): Promise<boolean>;
    /**
     * FR-101: Calculate depth automatically based on featurePath
     * Computes the nesting level by counting 'specs-tree-' occurrences in the path
     */
    private computeDepth;
    /**
     * FR-101: Initialize phaseHistory consistently
     * Either uses the provided history or creates a standard initial entry
     */
    private initPhaseHistory;
    /**
     * Validates state against expected schema
     */
    private validateState;
    /**
     * Clears cache to force re-loading
     */
    clearCache(): void;
    /**
     * Gets the scan tree structure for the root director
     */
    getTreeStructure(): Promise<ReturnType<typeof scanTreeStructure>>;
}
