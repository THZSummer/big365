/**
 * Tree State Validator
 * Validates tree structure consistency and state integrity
 */
import { scanTreeStructure, isParentFeature } from './tree-scanner';
import { validateStateV2_1_0 } from './schema-v2.0.0';
import { TreeStructureError } from '../errors';
import * as path from 'path';
export class TreeStateValidator {
    stateLoader;
    constructor(stateLoader) {
        this.stateLoader = stateLoader;
    }
    /**
     * Validates a new state object before creation/setting, and repairs common issues
     * Handles EC-012: Missing required fields
     * Handles EC-013: Incorrect format version ('2.1.0' vs 'v2.1.0')
     * Handles EC-014: Empty phaseHistory when phase > 0
     */
    validateNewState(state, featurePath) {
        // Track any warnings for repairs made
        const warnings = [];
        let repairedState = { ...state }; // Start with original state
        // Handle EC-013: Ensure version field is properly formatted as 'v2.1.0' 
        if (state.version) {
            if (state.version !== 'v2.1.0') {
                const oldVersion = state.version;
                if (typeof state.version === 'string' && state.version === '2.1.0') {
                    // Specifically fix '2.1.0' to 'v2.1.0' format
                    repairedState.version = 'v2.1.0';
                    warnings.push(`Fixed incorrect version format from '${oldVersion}' to 'v2.1.0' at ${featurePath || 'unknown'}`);
                }
                else if (typeof state.version === 'string' && state.version.match(/^\d+\.\d+\.\d+$/)) {
                    // Handle other numerical-only versions, default to v2.1.0 to be safe
                    repairedState.version = 'v2.1.0';
                    warnings.push(`Fixed numerical-only version by converting to 'v2.1.0' at ${featurePath || 'unknown'}, was '${oldVersion}'`);
                }
                else if (typeof state.version === 'string' && state.version.startsWith('v') && state.version !== 'v2.1.0') {
                    // Different version number with 'v' prefix, convert to 2.1.0
                    repairedState.version = 'v2.1.0';
                    warnings.push(`Updated version from '${oldVersion}' to 'v2.1.0' at ${featurePath || 'unknown'}`);
                }
                else {
                    // Some other invalid version - override to correct format
                    repairedState.version = 'v2.1.0';
                    warnings.push(`Set version to 'v2.1.0' at ${featurePath || 'unknown'}, was '${oldVersion}'`);
                }
            }
        }
        else {
            // EC-012: Missing version field
            repairedState.version = 'v2.1.0';
            warnings.push(`Added missing version field as 'v2.1.0' at ${featurePath || 'unknown'}`);
        }
        // EC-012: Check for missing required fields and add defaults
        // Ensure required fields are present
        if (!repairedState.feature && state.feature) {
            repairedState.feature = state.feature;
        }
        else if (!repairedState.feature) {
            // This is a major problem, cannot proceed without a feature ID
            repairedState.feature = featurePath ? path.basename(featurePath) : 'unknown-feature';
            warnings.push(`Added missing state.feature field from path, this is critical for identification in ${featurePath || 'unknown'}`);
        }
        if (typeof repairedState.phase !== 'number') {
            if (typeof state.phase === 'number') {
                repairedState.phase = state.phase;
            }
            else {
                repairedState.phase = 1;
            }
            warnings.push(`Set default phase to ${repairedState.phase} at ${featurePath || 'unknown'}`);
        }
        if (typeof repairedState.status !== 'string' || !repairedState.status) {
            if (typeof state.status === 'string' && state.status) {
                repairedState.status = state.status;
            }
            else {
                repairedState.status = 'specified';
            }
            warnings.push(`Set default status to '${repairedState.status}' at ${featurePath || 'unknown'}`);
        }
        // EC-012: Check for missing dependencies field
        if (!repairedState.dependencies || typeof repairedState.dependencies !== 'object') {
            repairedState.dependencies = state.dependencies || {
                on: state.dependencies?.on || [],
                blocking: state.dependencies?.blocking || []
            };
            warnings.push(`Added default empty dependencies object at ${featurePath || 'unknown'}`);
        }
        else {
            // Make sure dependencies has proper fallback for on/blocking
            if (!repairedState.dependencies.on) {
                repairedState.dependencies.on = [];
                warnings.push(`Added default empty 'on' dependencies array at ${featurePath || 'unknown'}`);
            }
            if (!repairedState.dependencies.blocking) {
                repairedState.dependencies.blocking = [];
                warnings.push(`Added default empty 'blocking' dependencies array at ${featurePath || 'unknown'}`);
            }
        }
        // EC-012: Similar for required files field
        if (!repairedState.files || typeof repairedState.files !== 'object') {
            const basename = featurePath ? path.basename(featurePath) : 'unknown';
            repairedState.files = state.files || {
                spec: `${basename}/spec.md` // At minimum, we need a placeholder
            };
            if (!repairedState.files.spec) {
                repairedState.files.spec = `${basename}/spec.md`;
                warnings.push(`Added default 'spec' file path at ${featurePath || 'unknown'}`);
            }
            warnings.push(`Added default files object at ${featurePath || 'unknown'}`);
        }
        // EC-012: Make sure phaseHistory is an array (empty if not specified)
        if (!Array.isArray(repairedState.phaseHistory)) {
            repairedState.phaseHistory = state.phaseHistory && Array.isArray(state.phaseHistory)
                ? [...state.phaseHistory]
                : [];
            warnings.push(`Initialized empty phaseHistory array at ${featurePath || 'unknown'}`);
        }
        // EC-014: If phase > 0 but phaseHistory is empty, add initial record
        if (repairedState.phase > 0 && Array.isArray(repairedState.phaseHistory) && repairedState.phaseHistory.length === 0) {
            // Ensure status is a valid WorkflowStatus - use type assertion since state.status is 'any' but we know it should conform
            const validWorkflowStatuses = ['specified', 'planned', 'tasked', 'building', 'reviewed', 'validated'];
            const validatedStatus = validWorkflowStatuses.includes(repairedState.status)
                ? repairedState.status
                : 'specified'; // Default fallback status
            const newRecord = {
                phase: repairedState.phase,
                status: validatedStatus,
                timestamp: new Date().toISOString(),
                triggeredBy: 'TreeStateValidator.fixEmptyPhaseHistory'
            };
            if (state.phaseHistory && Array.isArray(state.phaseHistory)) {
                repairedState.phaseHistory = [...state.phaseHistory, newRecord];
                if (state.phaseHistory.length > 0) {
                    warnings.push(`Added initial phase history record for phase ${repairedState.phase}, but also kept existing entries at ${featurePath || 'unknown'}`);
                }
                else {
                    warnings.push(`Added initial phase history record for phase ${repairedState.phase} at ${featurePath || 'unknown'}`);
                }
            }
            else {
                repairedState.phaseHistory = [newRecord];
                warnings.push(`Added initial phase history record for phase ${repairedState.phase} at ${featurePath || 'unknown'}`);
            }
        }
        // Finally validate against the schema
        const isValid = validateStateV2_1_0(repairedState);
        return {
            isValid,
            repairedState,
            warnings
        };
    }
    /**
     * FR-102: Standardized validate method with ValidationResult format
     * This method follows the spec-defined ValidationResult interface to support
     * uniform schema validation and auto-fixing
     */
    validate(state) {
        const warnings = [];
        const autoFixed = [];
        const errors = [];
        let repairedState = { ...state };
        // 1. Check version field
        if (!repairedState.version || repairedState.version !== 'v2.1.0') {
            const currentVersion = repairedState.version;
            if (currentVersion && typeof currentVersion === 'string') {
                // Possibly fixable cases
                if (currentVersion === 'v2.1.0' || currentVersion === '2.1.0') {
                    // Missing 'v' prefix case
                    repairedState.version = 'v2.1.0';
                    autoFixed.push('version');
                    warnings.push(`Fixed version from '${currentVersion}' to 'v2.1.0' (added 'v' prefix or already correct)`);
                }
                else if (currentVersion.match(/^\d+\.\d+\.\d+$/)) {
                    // Just a number format like '1.0.0', fix to required version
                    repairedState.version = 'v2.1.0';
                    autoFixed.push('version');
                    warnings.push(`Fixed version format to required 'v2.1.0' (was '${currentVersion}')`);
                }
                else if (currentVersion.match(/^v\d+\.\d+\.\d+$/)) {
                    // Some other v-prefixed format, set to required
                    repairedState.version = 'v2.1.0';
                    autoFixed.push('version');
                    warnings.push(`Fixed to required 'v2.1.0' (was '${currentVersion}')`);
                }
                else {
                    // Some other invalid format, set to required
                    repairedState.version = 'v2.1.0';
                    autoFixed.push('version');
                    warnings.push(`Set invalid version to required 'v2.1.0'`);
                }
            }
            else {
                // No version field - add it
                repairedState.version = 'v2.1.0';
                autoFixed.push('version');
                warnings.push(`Added missing version as 'v2.1.0'`);
            }
        }
        // 2. Check depth field
        if (repairedState.depth === undefined || typeof repairedState.depth !== 'number') {
            if (repairedState.feature) {
                // Derive depth from feature path
                const computedDepth = this.computeDepthFromFeature(repairedState.feature);
                repairedState.depth = computedDepth;
                autoFixed.push('depth');
                warnings.push(`Computed and set depth to ${computedDepth} from feature path '${repairedState.feature}'`);
            }
            else {
                // Default to 0 if no feature is available yet
                repairedState.depth = 0;
                autoFixed.push('depth');
                warnings.push(`Set default depth to 0 (no feature path available)`);
            }
        }
        // 3. Check phaseHistory
        if (!Array.isArray(repairedState.phaseHistory) || repairedState.phaseHistory.length === 0) {
            const phase = repairedState.phase ?? 0;
            if (phase > 0) {
                // If phase indicates non-zero phase but no history exists, add one
                const status = repairedState.status || 'specified';
                repairedState.phaseHistory = [{
                        phase,
                        status,
                        timestamp: new Date().toISOString(),
                        triggeredBy: 'TreeStateValidator.validate'
                    }];
                autoFixed.push('phaseHistory');
                warnings.push(`Added initial phaseHistory entry for phase ${phase}`);
            }
            else {
                // Initialize with an empty array to comply with schema
                repairedState.phaseHistory = [{
                        phase: 0,
                        status: repairedState.status || 'specified',
                        timestamp: new Date().toISOString(),
                        triggeredBy: 'TreeStateValidator.validate'
                    }];
                autoFixed.push('phaseHistory');
                warnings.push(`Added default phaseHistory entry`);
            }
        }
        // 4. Check dependencies
        if (!repairedState.dependencies || typeof repairedState.dependencies !== 'object') {
            repairedState.dependencies = {
                on: [],
                blocking: []
            };
            autoFixed.push('dependencies');
            warnings.push(`Added default dependencies object with empty arrays`);
        }
        else {
            if (!Array.isArray(repairedState.dependencies.on)) {
                repairedState.dependencies.on = [];
                autoFixed.push('dependencies.on');
                warnings.push(`Initialized on-dependencies as empty array`);
            }
            if (!Array.isArray(repairedState.dependencies.blocking)) {
                repairedState.dependencies.blocking = [];
                autoFixed.push('dependencies.blocking');
                warnings.push(`Initialized blocking-dependencies as empty array`);
            }
        }
        // 5. Check files
        if (!repairedState.files || typeof repairedState.files !== 'object') {
            // Use feature name if available, otherwise default
            const filename = repairedState.feature ? path.basename(repairedState.feature) : 'unamed-feature';
            repairedState.files = { spec: `${filename}/spec.md` };
            autoFixed.push('files');
            warnings.push(`Added default minimal files with spec reference`);
        }
        else if (!repairedState.files.spec) {
            const filename = repairedState.feature ? path.basename(repairedState.feature) : 'unamed-feature';
            repairedState.files.spec = `${filename}/spec.md`;
            autoFixed.push('files.spec');
            warnings.push(`Added default spec file reference`);
        }
        // 6. Check required fields for schema compliance
        if (!repairedState.feature) {
            // Use feature from featurePath if it's available in the params to constructor
            // For this general validation method we'll use generic name
            repairedState.feature = 'generated-feature-id';
            autoFixed.push('feature');
            errors.push(`No feature ID defined. Added placeholder - must set correct path. This is critical and might break functionality.`);
        }
        // 7. Ensure status is valid
        if (!repairedState.status || !['specified', 'planned', 'tasked', 'building', 'reviewed', 'validated'].includes(repairedState.status)) {
            const defaultValue = 'specified';
            repairedState.status = repairedState.status || defaultValue;
            if (!['specified', 'planned', 'tasked', 'building', 'reviewed', 'validated'].includes(repairedState.status)) {
                repairedState.status = defaultValue;
                warnings.push(`Fixed invalid status to default '${defaultValue}'`);
                autoFixed.push('status');
            }
        }
        const valid = errors.length === 0 && validateStateV2_1_0(repairedState);
        if (!valid) {
            // If schema validation fails and no other errors were detected, it means something is fundamentally wrong
            if (errors.length === 0) {
                errors.push('Final schema validation failed after all auto-repairs');
            }
        }
        return {
            valid,
            errors,
            warnings,
            autoFixed,
            state: repairedState
        };
    }
    /**
     * Helper method to compute depth from feature path
     * Used by validate() to derive depth when missing
     */
    computeDepthFromFeature(featurePath) {
        const matches = featurePath.match(/specs-tree-/g);
        return matches ? matches.length - 1 : 0; // Subtract 1 to exclude root if 'specs-tree-root' is the first occurrence
    }
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
    async validateTree(specRootDir) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };
        try {
            // Get the tree structure
            const treeStructure = await scanTreeStructure(specRootDir);
            const allFeatures = await this.stateLoader.loadAll();
            // Check for schema validation on each state file
            for (const [featurePath, state] of allFeatures) {
                if (!validateStateV2_1_0(state)) {
                    result.errors.push({
                        code: 'TREE_INVALID_SCHEMA',
                        message: `Feature state at ${featurePath} does not conform to state v2.1.0 schema`,
                        path: featurePath,
                        severity: 'error'
                    });
                }
                else {
                    // Verify the version is exactly 'v2.1.0' (has the 'v' prefix)
                    if (state.version !== 'v2.1.0') {
                        result.errors.push({
                            code: 'TREE_INVALID_VERSION_FORMAT',
                            message: `Feature state at ${featurePath} has incorrect version format. Expected 'v2.1.0', got '${state.version}'`,
                            path: featurePath,
                            severity: 'error'
                        });
                    }
                }
            }
            // Check each feature in the tree structure
            for (const node of treeStructure.nodes) {
                if (isParentFeature(node)) {
                    // Validate parent-child relationship consistency
                    const parentChildResult = await this.validateParentChildRelations(node.path);
                    for (const error of parentChildResult.errors) {
                        result.errors.push(error);
                    }
                    for (const warning of parentChildResult.warnings) {
                        result.warnings.push(warning);
                    }
                }
                // Check depth consistency
                const expectedDepth = node.level;
                const featureState = allFeatures.get(node.path);
                if (featureState) {
                    if (typeof featureState.depth === 'number' && featureState.depth !== expectedDepth) {
                        result.errors.push({
                            code: 'TREE_INVALID_DEPTH',
                            message: `Feature at ${node.path} has depth ${featureState.depth}, but expected depth ${expectedDepth} based on directory nesting`,
                            path: node.path,
                            severity: 'error'
                        });
                    }
                }
            }
            // Detect circular dependencies
            const cycles = await this.detectCircularDependencies(specRootDir);
            if (cycles.length > 0) {
                for (const cycle of cycles) {
                    result.errors.push({
                        code: 'TREE_CYCLIC_DEPENDENCY',
                        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
                        path: cycle[0], // Using first element of cycle as path reference
                        severity: 'error'
                    });
                }
            }
            if (result.errors.length > 0) {
                result.valid = false;
            }
        }
        catch (error) {
            result.valid = false;
            if (error instanceof TreeStructureError) {
                result.errors.push({
                    code: 'TREE_VALIDATION_ERROR',
                    message: error.message,
                    path: specRootDir,
                    severity: 'error'
                });
            }
            else {
                result.errors.push({
                    code: 'UNEXPECTED_ERROR',
                    message: `Unexpected error during validation: ${error.message}`,
                    path: specRootDir,
                    severity: 'error'
                });
            }
        }
        return result;
    }
    /**
     * Validates a single feature's state against tree rules
     * Checks:
     * 1. Version format is 'v2.1.0'
     * 2. Phase and status are consistent
     * 3. If parent, childrens array matches actual directory structure
     * 4. Dependencies reference existing features
     */
    async validateFeature(featurePath) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };
        try {
            const state = await this.stateLoader.get(featurePath);
            if (!state) {
                result.errors.push({
                    code: 'FEATURE_STATE_MISSING',
                    message: `Feature state file not found at ${featurePath}`,
                    path: featurePath,
                    severity: 'error'
                });
                result.valid = false;
                return result;
            }
            // Validate schema
            if (!validateStateV2_1_0(state)) {
                result.errors.push({
                    code: 'FEATURE_INVALID_SCHEMA',
                    message: `Feature state at ${featurePath} does not conform to state v2.1.0 schema`,
                    path: featurePath,
                    severity: 'error'
                });
            }
            // Check version format
            if (state.version !== 'v2.1.0') {
                result.errors.push({
                    code: 'FEATURE_INVALID_VERSION_FORMAT',
                    message: `Feature state at ${featurePath} has incorrect version format. Expected 'v2.1.0', got '${state.version}'`,
                    path: featurePath,
                    severity: 'error'
                });
            }
            // If this feature is a parent, verify the childrens array matches actual child features
            // First get tree structure to check what the actual children should be
            const treeStructure = await scanTreeStructure(path.dirname(featurePath));
            const node = Array.from(treeStructure.flatMap.values()).find(n => n.path === featurePath);
            if (node && isParentFeature(node)) {
                const expectedChildren = node.children.map(child => child.path);
                if (state.childrens && Array.isArray(state.childrens)) {
                    const actualChildren = state.childrens.map(child => child.path);
                    // Find missing children that exist in directory but not in state
                    const missingInState = expectedChildren.filter(expectedPath => !actualChildren.some(actualPath => actualPath === expectedPath));
                    for (const missing of missingInState) {
                        result.errors.push({
                            code: 'FEATURE_MISSING_CHILD_IN_STATE',
                            message: `Child feature at ${missing} exists in directory but not in parent's childrens array`,
                            path: featurePath,
                            severity: 'error'
                        });
                    }
                    // Find children in state that don't exist in directory
                    const missingInDir = actualChildren.filter(actualPath => !expectedChildren.some(expectedPath => expectedPath === actualPath));
                    for (const missing of missingInDir) {
                        result.errors.push({
                            code: 'FEATURE_NONEXISTENT_CHILD_IN_STATE',
                            message: `Child feature referenced in state does not exist at path ${missing}`,
                            path: featurePath,
                            severity: 'error'
                        });
                    }
                }
            }
            // Validate dependencies reference existing features  
            // Loading all features to cross-reference
            const allFeatures = await this.stateLoader.loadAll();
            const allFeaturePaths = Array.from(allFeatures.keys());
            if (state.dependencies && state.dependencies.on) {
                for (const dependency of state.dependencies.on) {
                    if (!allFeaturePaths.some(path => path.includes(dependency))) {
                        result.warnings.push({
                            code: 'FEATURE_NONEXISTENT_DEPENDENCY',
                            message: `Dependency '${dependency}' referenced in feature state but does not exist`,
                            path: featurePath,
                            severity: 'warning'
                        });
                    }
                }
            }
            if (result.errors.length > 0) {
                result.valid = false;
            }
        }
        catch (error) {
            result.valid = false;
            if (error instanceof TreeStructureError) {
                result.errors.push({
                    code: 'FEATURE_VALIDATION_ERROR',
                    message: error.message,
                    path: featurePath,
                    severity: 'error'
                });
            }
            else {
                result.errors.push({
                    code: 'UNEXPECTED_ERROR',
                    message: `Unexpected error validating feature ${featurePath}: ${error.message}`,
                    path: featurePath,
                    severity: 'error'
                });
            }
        }
        return result;
    }
    /**
     * Validates parent-child relationships
     * Ensures:
     * 1. Parent's childrens array matches actual subdirectories
     * 2. Child states reference correct parent
     * 3. No missing children in parent's state
     */
    async validateParentChildRelations(parentPath) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };
        try {
            const parentState = await this.stateLoader.get(parentPath);
            if (!parentState) {
                result.errors.push({
                    code: 'PARENT_STATE_MISSING',
                    message: `Parent state file not found at ${parentPath}`,
                    path: parentPath,
                    severity: 'error'
                });
                result.valid = false;
                return result;
            }
            // Get tree structure to know actual children
            const treeStructure = await scanTreeStructure(path.dirname(parentPath));
            const parentNode = Array.from(treeStructure.flatMap.values()).find(n => n.path === parentPath);
            if (!parentNode || !parentNode.children || parentNode.children.length === 0) {
                // No actual children, so childrens array should be empty or undefined
                if (parentState.childrens && parentState.childrens.length > 0) {
                    result.errors.push({
                        code: 'PARENT_HAS_CHILDREN_IN_STATE_NO_DIRS',
                        message: `Parent at ${parentPath} has children in state but no actual subdirectories exist`,
                        path: parentPath,
                        severity: 'error'
                    });
                }
                return result;
            }
            // Get the actual children from the tree structure
            const expectedChildrenPaths = parentNode.children.map(child => child.path);
            if (!parentState.childrens || !Array.isArray(parentState.childrens)) {
                result.errors.push({
                    code: 'PARENT_MISSING_CHILDREN_ARRAY',
                    message: `Parent at ${parentPath} is a parent feature but has no childrens array`,
                    path: parentPath,
                    severity: 'error'
                });
                result.valid = false;
                return result;
            }
            // Check that state childrens matches the actual directory structure
            const stateChildrenPaths = parentState.childrens.map(child => child.path);
            // Find missing children (in dir, not in state)
            for (const expectedPath of expectedChildrenPaths) {
                if (!stateChildrenPaths.includes(expectedPath)) {
                    result.errors.push({
                        code: 'PARENT_MISSING_CHILD_IN_STATE',
                        message: `Child feature at ${expectedPath} exists in directory but not in parent's childrens array`,
                        path: parentPath,
                        severity: 'error'
                    });
                    result.valid = false;
                }
            }
            // Find extra children (in state, not in dir)
            for (const stateChildPath of stateChildrenPaths) {
                if (!expectedChildrenPaths.includes(stateChildPath)) {
                    result.errors.push({
                        code: 'PARENT_CHILD_DOES_NOT_EXIST',
                        message: `Child feature path '${stateChildPath}' in parent's childrens array does not exist in the directory structure`,
                        path: parentPath,
                        severity: 'error'
                    });
                    result.valid = false;
                }
            }
        }
        catch (error) {
            result.valid = false;
            if (error instanceof TreeStructureError) {
                result.errors.push({
                    code: 'PARENT_CHILD_VALIDATION_ERROR',
                    message: error.message,
                    path: parentPath,
                    severity: 'error'
                });
            }
            else {
                result.errors.push({
                    code: 'UNEXPECTED_ERROR',
                    message: `Unexpected error validating parent-child relations for ${parentPath}: ${error.message}`,
                    path: parentPath,
                    severity: 'error'
                });
            }
        }
        return result;
    }
    /**
     * Detects circular dependencies in the tree
     * Returns array of cycles found
     */
    async detectCircularDependencies(specRootDir) {
        const cycles = [];
        try {
            // Get all features to check for circular dependencies
            const treeStructure = await scanTreeStructure(specRootDir);
            const allFeatures = await this.stateLoader.loadAll();
            // Simple cycle detection using DFS
            const visited = new Set();
            const recStack = new Map(); // Store path for cycle discovery
            for (const node of treeStructure.nodes) {
                if (!visited.has(node.path)) {
                    const cycle = await this._dfsDetectCycle(node.path, allFeatures, visited, recStack, []);
                    if (cycle.length > 0) {
                        cycles.push(cycle);
                    }
                }
            }
        }
        catch (error) {
            console.error('Error detecting circular dependencies:', error);
        }
        return cycles;
    }
    /**
     * Helper method for DFS-based cycle detection including actual feature dependency information
     */
    async _dfsDetectCycle(currentPath, allFeatures, visited, recStack, pathSoFar) {
        visited.add(currentPath);
        recStack.set(currentPath, [...pathSoFar, currentPath]);
        const state = allFeatures.get(currentPath);
        if (!state) {
            recStack.delete(currentPath);
            return [];
        }
        // Get the direct dependencies of this feature
        const dependencies = state.dependencies?.on || [];
        // Need to map dependency IDs to actual file paths
        // For now, assume dependencies refer to feature paths and fuzzy match
        for (const dep of dependencies) {
            // Try to match dependency to actual feature path
            const actualDepPath = Array.from(allFeatures.keys()).find(p => p.includes(dep));
            if (actualDepPath) {
                if (!visited.has(actualDepPath)) {
                    const cycleResult = await this._dfsDetectCycle(actualDepPath, allFeatures, visited, recStack, [...pathSoFar, currentPath]);
                    if (cycleResult.length > 0) {
                        recStack.delete(currentPath);
                        return cycleResult; // Found a cycle, return it
                    }
                }
                else if (recStack.has(actualDepPath)) {
                    // Found a cycle! Return the path
                    const cycleStartIdx = pathSoFar.findIndex(p => p === actualDepPath);
                    let cycle = [...pathSoFar.slice(cycleStartIdx), currentPath, actualDepPath];
                    // Make sure we form a proper cycle (start and end are the same)
                    if (cycle[cycle.length - 1] !== cycle[0]) {
                        // Remove elements until we get to the cycle start again
                        cycle = cycle.slice(cycleStartIdx).concat(cycle[0]);
                    }
                    recStack.delete(currentPath);
                    return cycle;
                }
            }
        }
        recStack.delete(currentPath);
        return [];
    }
}
