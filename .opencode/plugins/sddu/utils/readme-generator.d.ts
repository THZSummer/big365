export interface SubFeatureInfo {
    id: string;
    name: string;
    dir: string;
    status: string;
    assignee?: string;
    description?: string;
    scope?: {
        included: string[];
        excluded: string[];
    };
    dependencies?: {
        upstream: string[];
        downstream: string[];
    };
    interfaces?: string;
}
export interface ReadmeTemplate {
    featureName: string;
    description?: string;
    subFeatures?: SubFeatureInfo[];
}
/**
 * 生成 Feature 级 README
 * @param template README 模板数据
 * @returns Markdown 格式的 README 内容
 */
export declare function generateFeatureReadme(template: ReadmeTemplate): string;
/**
 * 生成子 Feature 级 README
 * @param info 子 Feature 信息
 * @returns Markdown 格式的 README 内容
 */
export declare function generateSubFeatureReadme(info: SubFeatureInfo): string;
