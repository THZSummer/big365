import { StateLoader } from './state-loader';
/**
 * Manages parent feature states by updating their children arrays
 * Based on discovered sub-features in the tree structure
 */
export declare class ParentStateManager {
    /**
     * Scans all child features under a parent directory and updates the parent's state
     * with the list of children and their information.
     *
     * @param parentDir Path to the parent feature directory
     * @param stateLoader Instance of StateLoader for reading child states
     * @returns Success status
     */
    scanAndUpdateParentState(parentDir: string, stateLoader: StateLoader): Promise<boolean>;
    private discoverChildFeatures;
}
