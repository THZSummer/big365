export type WorkflowStatus = 'specified' | 'planned' | 'tasked' | 'building' | 'reviewed' | 'validated';
export interface PhaseHistory {
    phase: number;
    status: WorkflowStatus;
    timestamp: string;
    triggeredBy: string;
    comment?: string;
}
export interface ChildFeatureInfo {
    path: string;
    featureName: string;
    status: WorkflowStatus;
    phase: number;
    lastModified: string;
}
export interface StateV2_0_0 {
    feature: string;
    name?: string;
    version: string;
    status: WorkflowStatus;
    phase: number;
    phaseHistory: PhaseHistory[];
    files: {
        spec: string;
        plan?: string;
        tasks?: string;
        readme?: string;
        review?: string;
        validation?: string;
    };
    dependencies: {
        on: string[];
        blocking: string[];
    };
    metadata?: {
        priority?: string;
        featureId?: string;
        createdAt?: string;
        updatedAt?: string;
    };
    history?: Array<{
        timestamp: string;
        from?: string;
        to?: string;
        triggeredBy?: string;
        comment?: string;
        version?: string;
    }>;
}
export interface StateV2_1_0 extends Omit<StateV2_0_0, 'version'> {
    version: 'v2.1.0';
    depth?: number;
    childrens?: ChildFeatureInfo[];
    phaseHistory: PhaseHistory[];
    files: {
        spec: string;
        plan?: string;
        tasks?: string;
        readme?: string;
        review?: string;
        validation?: string;
    };
    dependencies: {
        on: string[];
        blocking: string[];
    };
}
export declare function validateState(state: any): state is StateV2_0_0;
export declare function validateStateV2_1_0(state: any): state is StateV2_1_0;
