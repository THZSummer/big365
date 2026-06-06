import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync, statSync } from 'fs';
import { scanTreeStructure } from '../state/tree-scanner';
/**
 * 检测 Feature 模式（父/叶结构），通过检查嵌套的 specs-tree-* 目录
 * 优先使用 specs-tree-* 模式而非旧的 sub-features/
 *
 * @param featurePath Feature 的根目录路径
 * @returns 'single' - 叶节点模式, 'multi' - 父节点模式
 */
export async function detectFeatureMode(featurePath) {
    // First, try to identify nested structures using tree scanner
    try {
        const treeStructure = await scanTreeStructure(path.dirname(featurePath));
        // Check if this particular feature path has children  
        const featureNode = Array.from(treeStructure.flatMap.values()).find(node => node.path === featurePath);
        if (featureNode && featureNode.children.length > 0) {
            return 'multi'; // Has children, so it's a parent feature  
        }
    }
    catch (error) {
        console.warn(`Failed to scan tree structure for ${featurePath}: `, error?.message);
    }
    // Alternative check: look for specs-tree-* subdirectories directly
    try {
        const items = await fs.readdir(featurePath);
        for (const item of items) {
            if (item.startsWith('specs-tree-')) {
                const itemPath = path.join(featurePath, item);
                const stat = statSync(itemPath);
                if (stat.isDirectory()) {
                    return 'multi'; // Has specs-tree-* subdirectories - it's a parent
                }
            }
        }
    }
    catch (error) {
        console.warn(`Failed to check subdirectories for ${featurePath}: `, error?.message);
    }
    // Check for old sub-features as fallback if new pattern isn't found
    const oldSubFeaturesPath = path.join(featurePath, 'sub-features');
    try {
        const oldDirExists = await pathExists(oldSubFeaturesPath);
        if (oldDirExists) {
            // But only consider this as multi if it has actual subdirs
            const items = await fs.readdir(oldSubFeaturesPath);
            for (const item of items) {
                const itemPath = path.join(oldSubFeaturesPath, item);
                const stat = statSync(itemPath);
                if (stat.isDirectory() && !item.startsWith('.')) {
                    return 'multi'; // Old sub-features found but marked as lower priority
                }
            }
        }
    }
    catch (error) {
        // Old method doesn't exist or accessible
    }
    // Default to single if no evidence of being a parent
    return 'single';
}
/**
 * 创建子 Feature 目录结构 using nested specs-tree layout
 *
 * @param parentFeaturePath Parent Feature 的根目录路径
 * @param subFeatureId Sub feature identifier (will become specs-tree-[id])
 * @param name Sub_feature 名称
 * @returns 子 Feature 目录路径
 */
export async function createSubFeature(parentFeaturePath, subFeatureId, name) {
    // Create the subfeature using nested specs-tree format
    const subFeatureDirName = `specs-tree-${subFeatureId}`;
    const subFeatureDir = path.join(parentFeaturePath, subFeatureDirName);
    // Create the subfeature directory
    await fs.mkdir(subFeatureDir, { recursive: true });
    // Create sub feature's basic files
    const specContent = `# Sub Feature: ${name}\n\n## Overview\n\n[Sub Feature overview]\n\n## Requirements Specification\n\n[Detailed requirement specification]\n\n## Implementation Plan\n\n[Implementation plan]\n\n## Task Breakdown\n\n[Task breakdown info]\n`;
    await fs.writeFile(path.join(subFeatureDir, 'spec.md'), specContent);
    // Create sub feature's README  
    const readmeContent = `# ${name}\n\nSub Feature: ${subFeatureId}\n\n## Quick Navigation\n\n- 📋 [Spec](spec.md) - Requirements Specification\n- 🏗️ [Plan](plan.md) - Technical Planning\n- 📝 [Tasks](tasks.md) - Task Breakdown\n\n## Current Status\n- Status: [to-do]\n- Assignee: [Unassigned]\n`;
    await fs.writeFile(path.join(subFeatureDir, 'README.md'), readmeContent);
    // Initialize this as a proper feature with state
    const initialFeatureState = {
        feature: subFeatureId,
        name: name,
        version: 'v2.1.0',
        status: 'specified',
        phase: 1,
        phaseHistory: [{
                phase: 1,
                status: 'specified',
                timestamp: new Date().toISOString(),
                triggeredBy: 'system',
                comment: 'Initial sub feature creation'
            }],
        files: {
            spec: path.join(subFeatureDir, 'spec.md')
        },
        dependencies: {
            on: [],
            blocking: []
        },
        metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        history: [{
                timestamp: new Date().toISOString(),
                from: 'drafting',
                to: 'specified',
                triggeredBy: 'system',
                comment: 'Created as subfeature'
            }]
    };
    await fs.writeFile(path.join(subFeatureDir, 'state.json'), JSON.stringify(initialFeatureState, null, 2));
    // Also create a placeholder plan.md and tasks.md  
    await fs.writeFile(path.join(subFeatureDir, 'plan.md'), `# ${name} - Plan\n\nTODO: Generate plan\n`);
    await fs.writeFile(path.join(subFeatureDir, 'tasks.md'), `# ${name} - Tasks\n\nTODO: Generate tasks\n`);
    return subFeatureDir;
}
/**
 * Generates sub-feature index table for the tree structure
 *
 * @param parentFeaturePath Parent Feature's root directory path
 * @returns Index table Markdown content
 */
export async function generateSubFeatureIndex(parentFeaturePath) {
    const mode = await detectFeatureMode(parentFeaturePath);
    if (mode === 'single') {
        return '';
    }
    try {
        // Use tree scanner to get nested structure info
        const treeStructure = await scanTreeStructure(path.dirname(parentFeaturePath));
        const featureNode = Array.from(treeStructure.flatMap.values()).find(node => node.path === parentFeaturePath);
        if (!featureNode) {
            return '';
        }
        // Process child features  
        const indexRows = await Promise.all(featureNode.children.map(async (childNode) => {
            const specPath = path.join(childNode.path, 'spec.md');
            let name = childNode.featureName;
            try {
                const specContent = await fs.readFile(specPath, 'utf8');
                // Extract subfeature info from spec.md
                const titleMatch = specContent.match(/^#\s*Sub Feature:\s*(.+)$/im);
                if (titleMatch) {
                    name = titleMatch[1];
                }
                // Try to get more info from state file  
                const statePath = path.join(childNode.path, 'state.json');
                let statusInfo = { status: 'unknown' };
                try {
                    const stateContent = await fs.readFile(statePath, 'utf8');
                    const stateData = JSON.parse(stateContent);
                    statusInfo = {
                        status: stateData.status || 'unknown'
                    };
                }
                catch (error) {
                    // State file doesn't exist, use default
                }
                return `| ${childNode.featureName} | ${name} | ${childNode.path} | ${statusInfo.status} | - | - |`;
            }
            catch (error) {
                // If spec file doesn't exist, still create index entry with defaults  
                return `| ${childNode.featureName} | ${name} | ${childNode.path} | [spec missing] | - | - |`;
            }
        }));
        if (indexRows.length === 0) {
            return '';
        }
        // Build complete table
        const tableHeader = '| Sub Feature ID | Sub Feature Name | Directory Path | Status | Assignee | Blockers |\n|----------------|------------------|----------------|--------|----------|----------|';
        return [tableHeader, ...indexRows].join('\n');
    }
    catch (error) {
        return '';
    }
}
/**
 * Scans sub feature directories and gets all sub feature metadata
 *
 * @param parentFeaturePath Parent Feature root directory path
 * @returns Array of sub feature metadata
 */
export async function scanSubFeatures(parentFeaturePath) {
    const mode = await detectFeatureMode(parentFeaturePath);
    if (mode === 'single') {
        return []; // Single mode means no sub-features in this new pattern
    }
    // Get the direct children from tree structure
    try {
        const treeStructure = await scanTreeStructure(path.dirname(parentFeaturePath));
        const featureNode = Array.from(treeStructure.flatMap.values()).find(node => node.path === parentFeaturePath);
        if (!featureNode || featureNode.children.length === 0) {
            return [];
        }
        const subFeatures = await Promise.all(featureNode.children.map(async (childNode) => {
            const statePath = path.join(childNode.path, 'state.json');
            let stateData = {
                id: childNode.featureName,
                name: childNode.featureName,
                status: 'uninit',
                dir: childNode.path
            };
            try {
                const stateContent = await fs.readFile(statePath, 'utf8');
                stateData = { ...stateData, ...JSON.parse(stateContent) };
            }
            catch (error) {
                // If state file doesn't exist, try to extract basic info from spec file  
                const specPath = path.join(childNode.path, 'spec.md');
                try {
                    const specContent = await fs.readFile(specPath, 'utf8');
                    const titleMatch = specContent.match(/^#\s*Sub Feature:\s*(.+)$/im);
                    if (titleMatch) {
                        stateData = {
                            ...stateData,
                            id: childNode.featureName,
                            name: titleMatch[1],
                            status: 'spec-missing'
                        };
                    }
                    else {
                        stateData = {
                            id: childNode.featureName,
                            name: childNode.featureName,
                            status: 'not-initialized',
                            dir: childNode.path
                        };
                    }
                }
                catch (specError) {
                    // Both state and spec don't exist  
                    stateData = {
                        id: childNode.featureName,
                        name: childNode.featureName,
                        status: 'not-initialized',
                        dir: childNode.path
                    };
                }
            }
            // Ensure returned object is complete   
            return {
                id: stateData.feature || stateData.id || childNode.featureName,
                name: stateData.name || stateData.id || childNode.featureName,
                status: stateData.status || 'unknown',
                assignee: stateData.assignee,
                dir: stateData.dir || childNode.path
            };
        }));
        return subFeatures;
    }
    catch (error) {
        return []; // If scan fails, return empty array
    }
}
/**
 * Validates sub feature document completeness
 *
 * @param subFeature Sub feature metadata
 * @returns Object containing validation results
 */
export function validateSubFeatureCompleteness(subFeature) {
    // Use the full path from the subFeature dir property
    const featureDir = subFeature.dir;
    const missing = [];
    try {
        // Check for required files
        const requiredFiles = ['spec.md', 'plan.md', 'tasks.md', 'README.md', 'state.json'];
        for (const file of requiredFiles) {
            const fullPath = path.join(featureDir, file);
            if (!existsSync(fullPath)) {
                missing.push(file);
            }
        }
        return {
            valid: missing.length === 0,
            missing: missing
        };
    }
    catch (error) {
        return {
            valid: false,
            missing: ['[access error or system issue]']
        };
    }
}
/**
 * Checks if path exists
 *
 * @param filepath Path to check
 * @returns Whether the path exists
 */
async function pathExists(filepath) {
    try {
        await fs.access(filepath);
        return true;
    }
    catch (error) {
        return false;
    }
}
