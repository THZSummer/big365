import { AgentMetadata } from "../types";
export interface AgentIntegrationResult {
    success: boolean;
    message: string;
    updatedStates?: string[];
    errors?: string[];
}
export declare function registerBuiltinAgents(): void;
export declare function registerAgents(context: any): Promise<{
    agents: AgentMetadata[];
    updateStateForAgentCall: (agentName: string, featureId: string) => Promise<AgentIntegrationResult>;
}>;
export type { FeatureStateEnum } from '../state/machine';
