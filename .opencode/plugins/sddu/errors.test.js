/**
 * errors.ts 单元测试
 * 测试统一错误处理系统
 */
import { ErrorCode, SdduError, StateError, DiscoveryError, ToolError, AgentError, ConfigError, ErrorHandler, formatErrorMessage, } from './errors';
describe('错误系统测试', () => {
    test('验证 ErrorCode 枚举', () => {
        const codes = Object.values(ErrorCode);
        expect(codes.length).toBeGreaterThan(0);
        expect(codes).toContain(ErrorCode.STATE_INVALID_TRANSITION);
        expect(codes).toContain(ErrorCode.DISCOVERY_STEP_EXECUTION_FAILED);
        expect(codes).toContain(ErrorCode.AGENT_NOT_FOUND);
    });
    test('SdduError 基本功能', () => {
        const context = {
            code: ErrorCode.TOOL_ARGUMENT_INVALID,
            details: { argName: 'testArg', expectedType: 'string' },
            timestamp: new Date().toISOString(),
            component: 'Test Component'
        };
        const error = new SdduError('Test error message', context);
        expect(error.message).toBe('Test error message');
        expect(error.code).toBe(ErrorCode.TOOL_ARGUMENT_INVALID);
        expect(error.context.component).toBe('Test Component');
        // 检查是否是 SDDU 错误（新属性名称）
        expect(error.isSdduError).toBe(true);
        expect(error.toDetailedString()).toContain('SDDU Error');
    });
    test('StateError 测试', () => {
        const error = new StateError(ErrorCode.STATE_VALIDATION_FAILED, 'State validation failed', { expected: 'planned', actual: 'drafting' });
        expect(error.message).toBe('State validation failed');
        expect(error.code).toBe(ErrorCode.STATE_VALIDATION_FAILED);
        expect(error.context.details).toEqual({ expected: 'planned', actual: 'drafting' });
    });
    test('DiscoveryError 测试', () => {
        const error = new DiscoveryError(ErrorCode.DISCOVERY_STEP_NOT_FOUND, 'Discovery step not found', { stepId: 'invalid-step' });
        expect(error.message).toBe('Discovery step not found');
        expect(error.code).toBe(ErrorCode.DISCOVERY_STEP_NOT_FOUND);
        expect(error.context.details).toEqual({ stepId: 'invalid-step' });
    });
    test('ToolError 测试', () => {
        const error = new ToolError(ErrorCode.TOOL_PARSE_ERROR, 'Tool parsing error', { input: '{ invalid: json' });
        expect(error.message).toBe('Tool parsing error');
        expect(error.code).toBe(ErrorCode.TOOL_PARSE_ERROR);
    });
    test('AgentError 测试', () => {
        const error = new AgentError(ErrorCode.AGENT_NOT_FOUND, 'Agent not found', { agentId: 'invalid-agent' });
        expect(error.message).toBe('Agent not found');
        expect(error.code).toBe(ErrorCode.AGENT_NOT_FOUND);
        expect(error.context.details).toEqual({ agentId: 'invalid-agent' });
    });
    test('ConfigError 测试', () => {
        const error = new ConfigError(ErrorCode.STATE_FILE_NOT_FOUND, 'Config file not found', { path: '/config/file.json' });
        expect(error.message).toBe('Config file not found');
        expect(error.code).toBe(ErrorCode.STATE_FILE_NOT_FOUND);
    });
    test('格式化错误消息', () => {
        const context = {
            code: ErrorCode.AGENT_EXECUTION_ERROR,
            details: { command: 'test-command' },
            timestamp: new Date().toISOString(),
            component: 'Test Component'
        };
        const error = new ToolError(ErrorCode.AGENT_EXECUTION_ERROR, 'Test error', { command: 'test-command' });
        const formattedMessage = formatErrorMessage(error);
        expect(formattedMessage).toContain('Test error');
        expect(formattedMessage).toContain(ErrorCode.AGENT_EXECUTION_ERROR);
    });
    test('ErrorHandler 处理不同类型的错误', () => {
        // 测试处理原始错误
        const rawError = new Error('Raw JavaScript error');
        const result = ErrorHandler.handle(rawError);
        expect(result instanceof SdduError).toBe(true);
        if (result instanceof SdduError) {
            expect(result.isSdduError).toBe(true);
        }
        // 测试处理已有 SdduError
        const sdduError = new ToolError(ErrorCode.TOOL_EXECUTE_ERROR, 'Tool error', { test: true });
        const handledSdduError = ErrorHandler.handle(sdduError);
        expect(handledSdduError).toBe(sdduError); // 应该返回相同的实例
        // 测试处理字符串
        const stringError = ErrorHandler.handle('A string error');
        if (stringError instanceof SdduError) {
            expect(stringError.message).toBe('A string error');
        }
    });
    test('ErrorContext 接口测试', () => {
        const context = {
            code: ErrorCode.FILE_READ_ERROR,
            details: {
                filePath: '/path/to/file',
                accessType: 'read'
            },
            timestamp: new Date().toISOString(),
            component: 'FileSystem',
            userId: 'testUser123',
            sessionId: 'session-abc-123'
        };
        expect(context.code).toBe(ErrorCode.FILE_READ_ERROR);
        expect(context.details?.filePath).toBe('/path/to/file');
    });
});
