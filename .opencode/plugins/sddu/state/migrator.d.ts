import { StateV2_0_0 } from './schema-v2.0.0';
/**
 * 迁移结果接口定义
 */
export interface MigrationResult {
    success: boolean;
    backupPath?: string;
    migratedToVersion?: string;
    error?: string;
}
/**
 * 从 v1.2.5/v1.2.11 版本迁移状态到 v2.0.0 版本
 * 将旧格式转换为新的 State Schema v2.0.0
 * @param oldState 原来的状态对象
 * @returns 迁移后的新状态对象
 */
export declare function migrateToV2(oldState: any): StateV2_0_0;
/**
 * 创建状态迁移备份
 * 迁移前自动备份原始状态
 * @param state 要备份的状态
 * @param featureId 主 feature ID
 * @param specsDir specs 目录路径
 * @returns 备份文件的路径
 */
export declare function backupState(state: any, featureId: string, specsDir: string): Promise<string>;
/**
 * 将状态回滚到备份文件
 * @param featureId 主 feature ID
 * @param specsDir specs 目录路径
 * @param backupPath 备份文件路径（如果不提供，则尝试找回最新的备份）
 * @returns 回滚后的状态
 */
export declare function rollbackState(featureId: string, specsDir: string, backupPath?: string): Promise<any>;
/**
 * 执行状态迁移
 * 自动检测旧格式状态，执行必要的迁移，并在必要时创建备份和提供回滚能力
 * @param oldState 原有的状态对象
 * @param featureId 主 feature ID
 * @param specsDir specs 目录路径
 * @returns 迁移结果
 */
export declare function migrateState(oldState: any, featureId: string, specsDir: string): Promise<MigrationResult>;
/**
 * 检查是否存在备份文件
 * @param specsDir specs 目录路径
 * @returns 是否存在备份
 */
export declare function hasBackup(specsDir: string): Promise<boolean>;
