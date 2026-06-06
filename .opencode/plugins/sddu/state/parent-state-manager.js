import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { validateStateV2_1_0 } from './schema-v2.0.0';
import { TreeStructureError, ErrorCode } from '../errors';
/**
 * Manages parent feature states by updating their children arrays
 * Based on discovered sub-features in the tree structure
 */
export class ParentStateManager {
    /**
     * Scans all child features under a parent directory and updates the parent's state
     * with the list of children and their information.
     *
     * @param parentDir Path to the parent feature directory
     * @param stateLoader Instance of StateLoader for reading child states
     * @returns Success status
     */
    async scanAndUpdateParentState(parentDir, stateLoader) {
        try {
            // First, read the parent's current state
            let parentState = await stateLoader.get(parentDir);
            if (!parentState) {
                // Try reading as v2.0.0 and upgrading - if there is no state, we'll return false
                throw new TreeStructureError(ErrorCode.STATE_FILE_NOT_FOUND, `Parent state file not found in ${parentDir}`);
            }
            // If parent state isn't already v2.1.0 compatible, convert it
            if (!parentState.version || parentState.version !== 'v2.1.0') {
                parentState.version = 'v2.1.0';
            }
            // Find immediate children in the parent directory
            const childFeatures = await this.discoverChildFeatures(parentDir, stateLoader);
            // Prepare the updated childrens array with proper type
            const childrens = childFeatures.map(child => ({
                path: child.featurePath,
                featureName: child.featureName,
                status: child.state ? child.state.status : 'specified', // Default to 'specified' if state unavailable
                phase: child.state ? child.state.phase : 1, // Default to phase 1 if state unavailable
                lastModified: child.lastModified || new Date().toISOString()
            }));
            // Update the parent state with childrens info
            const updatedParentState = {
                ...parentState,
                childrens: childrens,
                depth: 0 // Setting parent depth to 0 as a root node
            };
            // Verify the updated state is valid
            if (!validateStateV2_1_0(updatedParentState)) {
                throw new TreeStructureError(ErrorCode.PARENT_STATE_UPDATE_FAILED, `Updated parent state is not valid for ${parentDir}`);
            }
            // Save the updated state back to the loader
            const success = await stateLoader.set(parentDir, updatedParentState);
            if (success) {
                console.log(`Successfully updated parent state in ${parentDir} with ${childrens.length} children`);
            }
            else {
                throw new TreeStructureError(ErrorCode.PARENT_STATE_UPDATE_FAILED, `Failed to save updated parent state in ${parentDir}`);
            }
            return success;
        }
        catch (error) {
            if (error instanceof TreeStructureError) {
                console.error(`Tree structure error updating parent state: ${error.message}`);
                throw error; // Re-throw tree structure errors
            }
            else {
                console.error(`Unexpected error while updating parent state in ${parentDir}:`, error);
                throw new TreeStructureError(ErrorCode.PARENT_STATE_UPDATE_FAILED, `Unexpected error updating parent state in ${parentDir}: ${error.message}`);
            }
        }
    }
    async discoverChildFeatures(parentDir, stateLoader) {
        try {
            // We'll rely on stateLoader's getTreeStructure method to discover the tree
            const treeStructure = await stateLoader.getTreeStructure();
            // Find the parent node in the tree and get its direct children
            const parentNode = Array.from(treeStructure.flatMap.values()).find(node => node.path === parentDir);
            if (!parentNode) {
                console.warn(`Parent node not found in tree structure for path: ${parentDir}`);
                return [];
            }
            const childPromises = parentNode.children.map(async (childNode) => {
                // Load the state for this child
                const childState = await stateLoader.get(childNode.path);
                let lastModifiedDate = new Date().toISOString(); // Default for fallback
                // Try to get more accurate modification date from a state file
                try {
                    const statePath = path.join(childNode.path, 'state.json');
                    let stats = null;
                    try {
                        stats = await fsPromises.stat(statePath);
                    }
                    catch (error) {
                        // File does not exist or cannot be accessed, leave stats as null
                    }
                    if (stats) {
                        lastModifiedDate = stats.mtime.toISOString();
                    }
                }
                catch (err) {
                    console.warn(`Could not determine modification time for child ${childNode.path}`);
                }
                return {
                    featurePath: childNode.path,
                    featureName: childNode.featureName,
                    state: childState,
                    lastModified: lastModifiedDate
                };
            });
            return await Promise.all(childPromises);
        }
        catch (error) {
            throw new TreeStructureError(ErrorCode.TREE_SCAN_FAILED, `Failed to discover child features in ${parentDir}: ${error.message}`);
        }
    }
}
