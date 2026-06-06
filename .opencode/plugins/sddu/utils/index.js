/**
 * SDD 工具函数统一导出
 * 实现 FR-001~005: 统一工具函数管理，解决 T-001 工具函数分散问题
 */
// 从原工具文件 re-export 所有工具函数
export * from './tasks-parser';
export * from './subfeature-manager';
export * from './readme-generator';
export * from './dependency-notifier';
/**
 * 实用工具辅助函数集合
 */
export class UtilsHelper {
    /**
     * 安全获取对象属性
     */
    static safeGet(obj, path, defaultValue) {
        try {
            const keys = path.split('.');
            let result = obj;
            for (const key of keys) {
                if (result == null)
                    return defaultValue;
                result = result[key];
            }
            return result !== undefined ? result : defaultValue;
        }
        catch {
            return defaultValue;
        }
    }
    /**
     * 对象深度合并
     */
    static deepMerge(target, source) {
        if (!source || typeof source !== 'object')
            return target;
        const result = { ...target };
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (typeof source[key] === 'object' && source[key] !== null) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                }
                else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }
    /**
     * 防抖函数
     */
    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    /**
     * 节流函数
     */
    static throttle(func, interval) {
        let lastCallTime = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCallTime >= interval) {
                lastCallTime = now;
                func.apply(this, args);
            }
        };
    }
    /**
     * 格式化时间戳
     */
    static formatTimestamp(date) {
        return date.toISOString().replace('T', ' ').substring(0, 19);
    }
    /**
     * 估算耗时
     */
    static formatDuration(start) {
        const [seconds, nanoseconds] = process.hrtime(start);
        return `${(seconds * 1000 + nanoseconds / 1000000).toFixed(2)} ms`;
    }
    /**
     * 根据模式匹配过滤
     */
    static filterByPattern(items, pattern) {
        const regexp = new RegExp(pattern, 'i');
        return items.filter(item => regexp.test(item));
    }
}
/**
 * 系统信息工具
 */
export class SystemInfo {
    static getNodeVersion() {
        return process.version;
    }
    static getPlatform() {
        return process.platform;
    }
    static getArchitecture() {
        return process.arch;
    }
    static getWorkingDirectory() {
        return process.cwd();
    }
    static getMemoryUsage() {
        return process.memoryUsage();
    }
    static getUptime() {
        return process.uptime();
    }
}
// 默认导出
export default {
    UtilsHelper,
    SystemInfo,
};
