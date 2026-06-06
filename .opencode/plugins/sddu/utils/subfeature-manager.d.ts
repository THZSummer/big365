/**
 * 子 Feature 元数据接口
 */
export interface SubFeatureMeta {
    id: string;
    name: string;
    status: string;
    assignee?: string;
    dir: string;
}
/**
 * 检测 Feature 模式（父/叶结构），通过检查嵌套的 specs-tree-* 目录
 * 优先使用 specs-tree-* 模式而非旧的 sub-features/
 *
 * @param featurePath Feature 的根目录路径
 * @returns 'single' - 叶节点模式, 'multi' - 父节点模式
 */
export declare function detectFeatureMode(featurePath: string): Promise<'single' | 'multi'>;
/**
 * 创建子 Feature 目录结构 using nested specs-tree layout
 *
 * @param parentFeaturePath Parent Feature 的根目录路径
 * @param subFeatureId Sub feature identifier (will become specs-tree-[id])
 * @param name Sub_feature 名称
 * @returns 子 Feature 目录路径
 */
export declare function createSubFeature(parentFeaturePath: string, subFeatureId: string, name: string): Promise<string>;
/**
 * Generates sub-feature index table for the tree structure
 *
 * @param parentFeaturePath Parent Feature's root directory path
 * @returns Index table Markdown content
 */
export declare function generateSubFeatureIndex(parentFeaturePath: string): Promise<string>;
/**
 * Scans sub feature directories and gets all sub feature metadata
 *
 * @param parentFeaturePath Parent Feature root directory path
 * @returns Array of sub feature metadata
 */
export declare function scanSubFeatures(parentFeaturePath: string): Promise<SubFeatureMeta[]>;
/**
 * Validates sub feature document completeness
 *
 * @param subFeature Sub feature metadata
 * @returns Object containing validation results
 */
export declare function validateSubFeatureCompleteness(subFeature: SubFeatureMeta): {
    valid: boolean;
    missing: string[];
};
