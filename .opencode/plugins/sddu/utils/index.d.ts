/**
 * SDD 工具函数统一导出
 * 实现 FR-001~005: 统一工具函数管理，解决 T-001 工具函数分散问题
 */
export * from './tasks-parser';
export * from './subfeature-manager';
export * from './readme-generator';
export * from './dependency-notifier';
export type { ParsedTask, ParallelGroup, ExecutionWave, SubFeatureMeta } from '../types';
/**
 * 实用工具辅助函数集合
 */
export declare class UtilsHelper {
    /**
     * 安全获取对象属性
     */
    static safeGet<T>(obj: any, path: string, defaultValue?: T): T;
    /**
     * 对象深度合并
     */
    static deepMerge(target: any, source: any): any;
    /**
     * 防抖函数
     */
    static debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void;
    /**
     * 节流函数
     */
    static throttle<T extends (...args: any[]) => any>(func: T, interval: number): (...args: Parameters<T>) => void;
    /**
     * 格式化时间戳
     */
    static formatTimestamp(date: Date): string;
    /**
     * 估算耗时
     */
    static formatDuration(start: [number, number]): string;
    /**
     * 根据模式匹配过滤
     */
    static filterByPattern(items: string[], pattern: string): string[];
}
/**
 * 系统信息工具
 */
export declare class SystemInfo {
    static getNodeVersion(): string;
    static getPlatform(): NodeJS.Platform;
    static getArchitecture(): string;
    static getWorkingDirectory(): string;
    static getMemoryUsage(): NodeJS.MemoryUsage;
    static getUptime(): number;
}
declare const _default: {
    UtilsHelper: typeof UtilsHelper;
    SystemInfo: typeof SystemInfo;
};
export default _default;
