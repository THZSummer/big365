export interface MigrateSchemaOptions {
    feature?: string;
    all?: boolean;
    dryRun?: boolean;
    backup?: boolean;
    specsDir?: string;
}
export interface MigrationReport {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    results: Array<{
        featureId: string;
        success: boolean;
        message?: string;
        backupPath?: string;
        error?: string;
    }>;
}
/**
 * Schema 迁移命令类
 */
export declare class SdduMigrateSchemaCommand {
    private specsDir;
    constructor(specsDir?: string);
    /**
     * 执行迁移命令
     */
    execute(options: MigrateSchemaOptions): Promise<MigrationReport>;
    /**
     * 迁移单个 Feature
     */
    private migrateFeature;
    /**
     * 获取所有 Features
     */
    private getAllFeatures;
    /**
     * 打印迁移报告
     */
    private printReport;
}
export declare function runMigrateCommand(args: string[]): Promise<void>;
