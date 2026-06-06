import * as fs from 'fs/promises';
import * as path from 'path';
import { constants as fsConstants } from 'fs';
import { scanTreeStructure } from './tree-scanner';
import { TreeStateValidator } from './tree-state-validator'; // Static import
export class StateLoader {
    cache = new Map();
    cacheExpiryMs = 3000; // 3 seconds
    specRootDir;
    constructor(specRootDir = '.sddu/specs-tree-root') {
        this.specRootDir = specRootDir;
    }
    /**
     * Loads all distributed states using the tree scanner
     * Returns a Map where keys are feature paths and values are their states
     */
    async loadAll() {
        const result = new Map();
        const scanResult = await scanTreeStructure(this.specRootDir);
        const flatMap = scanResult.flatMap;
        for (const [featurePath, _] of flatMap) {
            // Extract the expected state file path for this feature
            const stateFilePath = path.join(this.specRootDir, featurePath, 'state.json');
            let fileExists = false;
            try {
                await fs.access(stateFilePath, fsConstants.F_OK);
                fileExists = true;
            }
            catch {
                // File does not exist
            }
            if (fileExists) {
                try {
                    const stateDataContent = await fs.readFile(stateFilePath, 'utf8');
                    const stateData = JSON.parse(stateDataContent);
                    // Verify the state against our schema
                    if (this.validateState(stateData)) {
                        result.set(featurePath, stateData);
                        // Update cache
                        this.cache.set(featurePath, {
                            state: stateData,
                            timestamp: Date.now()
                        });
                    }
                    else {
                        console.warn(`Invalid state found at ${stateFilePath}, skipping`);
                        // Still add to cache but with an error state to avoid repeated validations
                        this.cache.set(featurePath, {
                            state: null, // Mark as invalid/missing
                            timestamp: Date.now()
                        });
                    }
                }
                catch (error) {
                    console.error(`Error loading state from ${stateFilePath}: ${error.message}`);
                    this.cache.set(featurePath, {
                        state: null, // Mark as invalid/missing
                        timestamp: Date.now()
                    });
                }
            }
            else {
                // State file doesn't exist, cache this info as well
                this.cache.set(featurePath, {
                    state: null, // Mark as missing
                    timestamp: Date.now()
                });
            }
        }
        return result;
    }
    /**
     * Gets the state for a specific feature
     * Uses cache with 3-second expiry
     * - Applies automatic fixes for common schema issues (EC-012, EC-013, EC-014)
     */
    async get(featurePath) {
        // Check cache first
        const cached = this.cache.get(featurePath);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiryMs) {
            // If we have a validated state in cache, return it
            if (cached.state !== null) {
                return cached.state;
            }
        }
        // Cache expired or not available, load fresh
        const stateFilePath = path.join(this.specRootDir, featurePath, 'state.json');
        let fileExists = false;
        try {
            await fs.access(stateFilePath, fsConstants.F_OK);
            fileExists = true;
        }
        catch {
            // File does not exist
        }
        if (!fileExists) {
            this.cache.set(featurePath, {
                state: null,
                timestamp: Date.now()
            });
            return null;
        }
        try {
            const stateDataContent = await fs.readFile(stateFilePath, 'utf8');
            let stateData = JSON.parse(stateDataContent);
            // Apply validation and fix common issues if the state contains known issues
            if (this.stateHasIssues(stateData, featurePath)) {
                const repairedResult = await this.applyReparation(stateData, featurePath);
                stateData = repairedResult.state;
                if (repairedResult.fixedSomeIssues) {
                    // Optionally write back the fixed state, but for safety during load, just use in memory
                    console.warn(`WARNING: Automatic repair(s) applied to state in ${featurePath}:`, repairedResult.messages);
                }
            }
            if (this.validateState(stateData)) {
                this.cache.set(featurePath, {
                    state: stateData,
                    timestamp: Date.now()
                });
                return stateData;
            }
            else {
                // Still add to cache but try to validate with repair function as a backup
                console.warn(`State found at ${stateFilePath} doesn't fully validate, returning anyway for recovery`);
                this.cache.set(featurePath, {
                    state: stateData,
                    timestamp: Date.now()
                });
                return stateData;
            }
        }
        catch (error) {
            console.error(`Error loading state from ${stateFilePath}: ${error.message}`);
            this.cache.set(featurePath, {
                state: null,
                timestamp: Date.now()
            });
            return null;
        }
    }
    stateHasIssues(state, featurePath) {
        // Check for the most critical common issues described in EC-012, EC-013, and EC-014
        return (
        // EC-013: Version issues - if it's '2.1.0' instead of 'v2.1.0' OR if it's not starting with 'v'
        (state.version && typeof state.version === 'string' && (state.version === '2.1.0' || (!state.version.startsWith && state.version.match(/^\d+\.\d+\.\d+$/)) || (typeof state.version.startsWith === 'function' && !state.version.startsWith('v')))) ||
            // EC-012: Critical missing fields
            !state.version ||
            !state.feature ||
            !state.status ||
            typeof state.phase !== 'number' ||
            !state.phaseHistory ||
            !Array.isArray(state.phaseHistory) ||
            !state.files ||
            !state.dependencies ||
            // EC-014: Phase history missing for phase > 0
            (typeof state.phase === 'number' && state.phase > 0 && Array.isArray(state.phaseHistory) && state.phaseHistory.length === 0));
    }
    async applyReparation(state, featurePath) {
        const repairs = [];
        // Create a copy of the state for modification
        let repairedState = { ...state };
        // Fix version - check for issue EC-013
        if (repairedState.version) {
            if (repairedState.version !== 'v2.1.0') {
                if (typeof repairedState.version === 'string' && repairedState.version === '2.1.0') {
                    repairedState.version = 'v2.1.0';
                    repairs.push(`Fixed version from '${state.version}' to 'v2.1.0'`);
                }
                else if (typeof repairedState.version === 'string' && !repairedState.version.startsWith('v')) {
                    repairedState.version = `v${repairedState.version}`;
                    if (repairedState.version === 'v2.1.0') {
                        repairs.push(`Added 'v' prefix to version, resulting in correct 'v2.1.0': '${repairedState.version}'`);
                    }
                    else {
                        // If it became a different version (like 'v1.0.0'), change to required v2.1.0
                        repairedState.version = 'v2.1.0';
                        repairs.push(`Fixed to correct 'v2.1.0' - was '${state.version}', got intermediate: 'v${state.version}'`);
                    }
                }
                else {
                    // Some other format, set to correct v2.1.0
                    repairedState.version = 'v2.1.0';
                    repairs.push(`Set version to required 'v2.1.0' from invalid '${state.version}'`);
                }
            }
        }
        else {
            repairedState.version = 'v2.1.0';
            repairs.push(`Added missing 'version' as 'v2.1.0'`);
        }
        // EC-012 checks and fixes
        if (!repairedState.feature) {
            repairedState.feature = featurePath ? path.basename(featurePath) : 'unknown';
            repairs.push(`Added missing feature field from path`);
        }
        if (typeof repairedState.status !== 'string' || !repairedState.status) {
            repairedState.status = state.status || 'specified';
            if (!repairedState.status) {
                repairedState.status = 'specified';
                repairs.push(`Added default empty status as 'specified'`);
            }
            else {
                repairs.push(`Used provided status '${repairedState.status}'`);
            }
        }
        if (typeof repairedState.phase !== 'number') {
            repairedState.phase = typeof state.phase === 'number' ? state.phase : 1;
            repairs.push(`Added default phase 1`);
        }
        if (!Array.isArray(repairedState.phaseHistory)) {
            repairedState.phaseHistory = Array.isArray(state.phaseHistory) ? [...state.phaseHistory] : [];
            repairs.push(`Initialized phaseHistory array`);
        }
        if (!repairedState.files || typeof repairedState.files !== 'object') {
            const basename = featurePath ? path.basename(featurePath) : 'unknown';
            repairedState.files = state.files || { spec: `${basename}/spec.md` };
            repairs.push(`Added default minimal files definition`);
        }
        if (!repairedState.dependencies || typeof repairedState.dependencies !== 'object') {
            repairedState.dependencies = state.dependencies || {
                on: (state.dependencies && Array.isArray(state.dependencies.on)) ? [...state.dependencies.on] : [],
                blocking: (state.dependencies && Array.isArray(state.dependencies.blocking)) ? [...state.dependencies.blocking] : [],
            };
            repairs.push(`Added default dependencies object`);
        }
        else {
            if (!Array.isArray(repairedState.dependencies.on)) {
                repairedState.dependencies.on = (state.dependencies && Array.isArray(state.dependencies.on)) ? [...state.dependencies.on] : [];
                repairs.push(`Fixed dependencies.on to be empty array`);
            }
            if (!Array.isArray(repairedState.dependencies.blocking)) {
                repairedState.dependencies.blocking = (state.dependencies && Array.isArray(state.dependencies.blocking)) ? [...state.dependencies.blocking] : [];
                repairs.push(`Fixed dependencies.blocking to be empty array`);
            }
        }
        // EC-014: Fill phaseHistory if phase > 0 but history empty
        if (repairedState.phase > 0 && Array.isArray(repairedState.phaseHistory) && repairedState.phaseHistory.length === 0) {
            repairedState.phaseHistory.push({
                phase: repairedState.phase,
                status: repairedState.status,
                timestamp: new Date().toISOString(),
                triggeredBy: 'StateLoader.fixMissingPhaseHistory'
            });
            repairs.push(`Added initial phase history entry for phase ${repairedState.phase} as required`);
        }
        return {
            state: repairedState,
            fixedSomeIssues: repairs.length > 0,
            messages: repairs
        };
    }
    /**
     * Sets the state for a specific feature
     * Updates cache and writes to the distributed file
     */
    async set(featurePath, state) {
        if (!this.validateState(state)) {
            console.error(`Invalid state provided for ${featurePath}`);
            return false;
        }
        // Ensure the directory exists
        const stateFilePath = path.join(this.specRootDir, featurePath, 'state.json');
        const dirPath = path.dirname(stateFilePath);
        try {
            await fs.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            console.error(`Error creating directory ${dirPath}: ${error.message}`);
            return false;
        }
        try {
            // Write the new state to file
            await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2));
            // Update cache
            this.cache.set(featurePath, {
                state,
                timestamp: Date.now()
            });
            return true;
        }
        catch (error) {
            console.error(`Error writing state to ${stateFilePath}: ${error.message}`);
            return false;
        }
    }
    /**
     * Creates a new state for a given feature if it doesn't already exist
     * - Automatically calculates depth based on featurePath (FR-101)
     * - Initializes phaseHistory with consistent strategy (FR-101)
     * - Sets createdAt and updatedAt timestamps (FR-101)
     * - Calls TreeStateValidator for final validation and auto-fixing (FR-103)
     */
    async create(featurePath, initialState) {
        const now = new Date().toISOString();
        // FR-101: Compute depth automatically based on featurePath
        const computedDepth = this.computeDepth(featurePath);
        // Create complete state object with defaults
        const completeInitialState = {
            // Required fields - providing default fallbacks if not in initialState
            feature: initialState.feature || path.basename(featurePath),
            name: initialState.name, // Preserve name if provided
            version: 'v2.1.0', // Force v2.1.0 format (FR-101)
            status: initialState.status || 'specified', // FR: Use 'specified' as the first valid status in v2.1.0 schema
            phase: initialState.phase ?? 0, // Starting at 0 as an initial discovery phase value
            depth: initialState.depth ?? computedDepth, // FR-101: Auto-calculate depth
            phaseHistory: this.initPhaseHistory(initialState, now), // FR-101: Consistent initialization
            files: {
                spec: initialState.files?.spec || `${path.basename(featurePath)}/spec.md`,
                plan: initialState.files?.plan,
                tasks: initialState.files?.tasks,
                readme: initialState.files?.readme,
                review: initialState.files?.review,
                validation: initialState.files?.validation
            },
            dependencies: {
                on: initialState.dependencies?.on || [], // Default to empty array - fix for EC-012
                blocking: initialState.dependencies?.blocking || [] // Default to empty array - fix for EC-012
            },
            childrens: initialState.childrens || [],
            metadata: initialState.metadata,
            history: initialState.history
            // createdAt and updatedAt are handled by StateMachine or TreeStateValidator if needed
        };
        // FR-103: Use TreeStateValidator to do final validation and auto-fixing
        const validator = new TreeStateValidator(this);
        const validationResult = validator.validateNewState(completeInitialState, featurePath);
        // Merge repair results
        const finalState = validationResult.repairedState;
        if (validationResult.warnings.length > 0) {
            console.warn(`StateLoader.create() warnings for ${featurePath}:`, validationResult.warnings);
        }
        if (!this.validateState(finalState)) {
            console.error(`Invalid initial state for ${featurePath}, but proceeding with validated/repairs`);
        }
        const stateFilePath = path.join(this.specRootDir, featurePath, 'state.json');
        // Check if a state file already exists
        let fileExists = false;
        try {
            await fs.access(stateFilePath, fsConstants.F_OK);
            fileExists = true;
        }
        catch {
            // File doesn't exist, that's fine for create operation
        }
        if (fileExists) {
            console.error(`State file already exists at ${stateFilePath}`);
            return false;
        }
        // Ensure the directory exists
        const dirPath = path.dirname(stateFilePath);
        try {
            await fs.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            console.error(`Error creating directory ${dirPath}: ${error.message}`);
            return false;
        }
        try {
            // Write the final validated state to file
            await fs.writeFile(stateFilePath, JSON.stringify(finalState, null, 2));
            // Update cache
            this.cache.set(featurePath, {
                state: finalState,
                timestamp: Date.now()
            });
            return true;
        }
        catch (error) {
            console.error(`Error creating state at ${stateFilePath}: ${error.message}`);
            return false;
        }
    }
    /**
     * FR-101: Calculate depth automatically based on featurePath
     * Computes the nesting level by counting 'specs-tree-' occurrences in the path
     */
    computeDepth(featurePath) {
        const matches = featurePath.match(/specs-tree-/g);
        return matches ? matches.length - 1 : 0; // Subtract 1 because "specs-tree-root" doesn't count as a level
    }
    /**
     * FR-101: Initialize phaseHistory consistently
     * Either uses the provided history or creates a standard initial entry
     */
    initPhaseHistory(initialState, now) {
        if (initialState.phaseHistory && initialState.phaseHistory.length > 0) {
            return [...initialState.phaseHistory];
        }
        const phase = initialState.phase ?? 1;
        const status = initialState.status || 'specified'; // Use 'specified' as the first valid state
        return [{
                phase,
                status,
                timestamp: now,
                triggeredBy: 'StateLoader.create'
            }];
    }
    /**
     * Validates state against expected schema
     */
    validateState(state) {
        // Basic check for required fields
        return (state &&
            typeof state === 'object' &&
            typeof state.feature === 'string' &&
            state.version === 'v2.1.0' // Assuming we want v2.1.0 format for tree structure
        );
    }
    /**
     * Clears cache to force re-loading
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Gets the scan tree structure for the root director
     */
    async getTreeStructure() {
        return await scanTreeStructure(this.specRootDir);
    }
}
