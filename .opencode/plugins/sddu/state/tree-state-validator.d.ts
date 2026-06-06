/**
 * Tree State Validator
 * Validates tree structure consistency and state integrity
 */
import { StateLoader } from './state-loader';
import { StateV2_1_0 } from './schema-v2.0.0';
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    autoFixed: string[];
    state: StateV2_1_0;
}
export interface TreeValidationResult {
    valid: boolean;
    errors: TreeValidationError[];
    warnings: TreeValidationWarning[];
}
export interface TreeValidationError {
    code: string;
    message: string;
    path: string;
    severity: 'error';
}
export interface TreeValidationWarning {
    code: string;
    message: string;
    path: string;
    severity: 'warning';
}
export declare class TreeStateValidator {
    private stateLoader;
    constructor(stateLoader: StateLoader);
    /**
     * Validates a new state object before creation/setting, and repairs common issues
     * Handles EC-012: Missing required fields
     * Handles EC-013: Incorrect format version ('2.1.0' vs 'v2.1.0')
     * Handles EC-014: Empty phaseHistory when phase > 0
     */
    validateNewState(state: any, featurePath?: string): {
        isValid: boolean;
        repairedState: StateV2_1_0;
        warnings: string[];
    };
    /**
     * FR-102: Standardized validate method with ValidationResult format
     * This method follows the spec-defined ValidationResult interface to support
     * uniform schema validation and auto-fixing
     */
    validate(state: Partial<StateV2_1_0>): ValidationResult;
    /**
     * Helper method to compute depth from feature path
     * Used by validate() to derive depth when missing
     */
    private computeDepthFromFeature;
    /**
     * Validates the entire tree structure for consistency
     * Checks:
     * 1. All state.json files have valid v2.1.0 schema
     * 2. Parent features have correct childrens array
     * 3. No orphaned features (features not reachable from root)
     * 4. No circular dependencies
     * 5. Depth values are consistent with actual nesting
     * 6. All parent features have depth = 0 (or correct relative depth)
     */
    validateTree(specRootDir: string): Promise<TreeValidationResult>;
    /**
     * Validates a single feature's state against tree rules
     * Checks:
     * 1. Version format is 'v2.1.0'
     * 2. Phase and status are consistent
     * 3. If parent, childrens array matches actual directory structure
     * 4. Dependencies reference existing features
     */
    validateFeature(featurePath: string): Promise<TreeValidationResult>;
    /**
     * Validates parent-child relationships
     * Ensures:
     * 1. Parent's childrens array matches actual subdirectories
     * 2. Child states reference correct parent
     * 3. No missing children in parent's state
     */
    validateParentChildRelations(parentPath: string): Promise<TreeValidationResult>;
    /**
     * Detects circular dependencies in the tree
     * Returns array of cycles found
     */
    detectCircularDependencies(specRootDir: string): Promise<string[][]>;
    /**
     * Helper method for DFS-based cycle detection including actual feature dependency information
     */
    private _dfsDetectCycle;
}
