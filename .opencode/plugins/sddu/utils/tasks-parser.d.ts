/**
 * 任务解析器 - 解析tasks.md的内容并计算执行顺序
 */
export interface ParsedTask {
    id: string;
    description: string;
    assignee?: string;
    dependencies: string[];
    group?: number;
    estimatedHours?: number;
}
export interface ParallelGroup {
    id: number;
    name: string;
    tasks: ParsedTask[];
    waitGroups?: number[];
}
export interface ExecutionWave {
    waveNumber: number;
    groups: ParallelGroup[];
    tasks: ParsedTask[];
}
export declare function parseParallelGroups(content: string): ParallelGroup[];
export declare function parseTasksMarkdown(content: string): {
    groups: ParallelGroup[];
    tasks: ParsedTask[];
};
export declare function parseTask(line: string, groupId?: number): ParsedTask | null;
export declare function computeExecutionOrder(groups: ParallelGroup[]): ExecutionWave[];
export declare function detectTaskCircularDependency(tasks: ParsedTask[]): string[] | null;
export declare function getReadyTasks(tasks: ParsedTask[], completedTasks: Set<string>): ParsedTask[];
export declare function getIncompleteTasks(tasks: ParsedTask[], completedTasks: Set<string>): ParsedTask[];
export declare function areDependenciesSatisfied(task: ParsedTask, completedTasks: Set<string>): boolean;
