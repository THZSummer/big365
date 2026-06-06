export interface ScanResult {
    nodes: FeatureTreeNode[];
    flatMap: Map<string, FeatureTreeNode>;
}
export interface FeatureTreeNode {
    id: string;
    path: string;
    featureName: string;
    level: number;
    children: FeatureTreeNode[];
    parent?: string;
}
/**
 * Scans and returns the tree structure rooted at specRootDir
 * Identifies specs-tree-* directories recursively and creates a node map
 */
export declare function scanTreeStructure(specRootDir: string): Promise<ScanResult>;
/**
 * Determines if a given node represents a parent feature (one that has children)
 */
export declare function isParentFeature(node: FeatureTreeNode): boolean;
