export type FeatureStatus = 'drafting' | 'discovered' | 'specified' | 'planned' | 'tasked' | 'implementing' | 'reviewed' | 'validated' | 'completed';
export interface SubFeatureRef {
    id: string;
    name?: string;
    dir: string;
    status: FeatureStatus;
    stateFile: string;
    assignee?: string;
}
export interface StateV1_2_5 {
    feature: string;
    name?: string;
    version: '1.2.5';
    status: FeatureStatus;
    phase?: number;
    mode?: 'single' | 'multi';
    files?: {
        spec?: string;
        plan?: string;
        tasks?: string;
        readme?: string;
    };
    dependencies?: {
        on?: string[];
        blocking?: string[];
    };
    assignee?: string;
    subFeatures?: SubFeatureRef[];
    createdAt?: string;
    updatedAt?: string;
}
/**
 * 验证 State 对象是否符合 v1.2.5 Schema
 */
export declare function validateState(state: any): {
    valid: boolean;
    errors: string[];
};
/**
 * 检查是否为多子 Feature 模式
 */
export declare function isMultiMode(state: StateV1_2_5): boolean;
/**
 * 创建初始状态对象
 */
export declare function createInitialState(feature: string, name?: string): StateV1_2_5;
