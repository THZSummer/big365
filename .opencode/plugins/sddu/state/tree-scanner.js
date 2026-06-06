import * as fs from 'fs/promises';
import * as path from 'path';
import { constants as fsConstants } from 'fs';
/**
 * Scans and returns the tree structure rooted at specRootDir
 * Identifies specs-tree-* directories recursively and creates a node map
 */
export async function scanTreeStructure(specRootDir) {
    const nodes = [];
    const flatMap = new Map();
    // Start scanning from the root directory
    const rootNodes = await scanDirectoryRecursively(specRootDir, 0, undefined);
    // Collect all nodes and populate the flatMap
    for (const node of rootNodes) {
        collectNodes(node, nodes, flatMap);
    }
    return { nodes, flatMap };
}
/**
 * Recursive helper to scan a directory and return feature tree nodes
 */
async function scanDirectoryRecursively(dir, level, parentPath) {
    try {
        await fs.access(dir, fsConstants.F_OK);
    }
    catch {
        // Directory does not exist, return empty array
        return [];
    }
    const entries = await fs.readdir(dir);
    const featureNodeChildren = [];
    for (const entry of entries) {
        if (entry.startsWith('.sddu'))
            continue; // Skip sddu metadata directories
        if (entry.startsWith('.'))
            continue; // Skip hidden directories
        const fullPath = path.join(dir, entry);
        const relPath = path.relative(process.cwd(), fullPath);
        // Check if this entry matches the specs-tree pattern
        if (entry.startsWith('specs-tree-')) {
            const featureName = entry.substring('specs-tree-'.length);
            // Create the feature node
            const featureNode = {
                id: entry,
                path: relPath,
                featureName,
                level,
                children: [],
                parent: parentPath
            };
            // Look for nested specs-tree-* subdirectories within this feature's directory
            try {
                const stat = await fs.stat(fullPath);
                if (stat.isDirectory()) {
                    // Recursively scan subdirectories for nested features
                    featureNode.children = await scanDirectoryRecursively(fullPath, level + 1, fullPath);
                }
            }
            catch (error) {
                console.warn(`Failed to scan subdirectory ${fullPath}: ${error.message}`);
            }
            featureNodeChildren.push(featureNode);
        }
    }
    return featureNodeChildren;
}
/**
 * Helper function to traverse all nodes and populate the flatMap and nodes array
 */
function collectNodes(node, nodes, flatMap) {
    // Add current node to flatMap using its path as key
    flatMap.set(node.path, node);
    nodes.push(node);
    // Recursively process children
    for (const child of node.children) {
        collectNodes(child, nodes, flatMap);
    }
}
/**
 * Determines if a given node represents a parent feature (one that has children)
 */
export function isParentFeature(node) {
    return node.children.length > 0;
}
