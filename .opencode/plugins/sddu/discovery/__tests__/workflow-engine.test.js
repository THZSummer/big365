/**
 * Unit tests for Discovery Workflow Split Suggestion Analysis (TASK-014)
 * Testing features:
 * - analyzeSplitSuggestion() identifies frontend/backend pattern
 * - analyzeSplitSuggestion() identifies multi-platform pattern
 * - analyzeSplitSuggestion() identifies admin/user pattern
 * - analyzeSplitSuggestion() handles ambiguous situations
 * - analyzeSplitSuggestion() returns null for no matches
 * - Case insensitive matching
 */
import { DiscoveryWorkflowEngine } from '../workflow-engine';
describe('Discovery Workflow Split Analysis Tests (TASK-014)', () => {
    let workflowEngine;
    beforeEach(() => {
        workflowEngine = new DiscoveryWorkflowEngine();
    });
    describe('FR-110.1: Frontend/backend pattern recognition', () => {
        test('recognizes "前端/后端" description', () => {
            const description = '需要实现一个电商系统，包含前端页面展示和后端数据处理';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.patterns).toHaveLength(1);
            expect(result.patterns[0].id).toBe('frontend-backend');
            expect(result.patterns[0].name).toBe('前后端分离');
            expect(result.suggestions).toHaveLength(1);
            expect(result.suggestions[0].patternId).toBe('frontend-backend');
            expect(result.suggestions[0].suggestedChildren).toHaveLength(2);
            expect(result.suggestions[0].suggestedChildren[0]).toEqual({
                id: 'frontend',
                name: '前端应用',
                description: '负责用户界面和交互的部分'
            });
            expect(result.suggestions[0].suggestedChildren[1]).toEqual({
                id: 'backend',
                name: '后端服务',
                description: '负责业务逻辑和数据存储的部分'
            });
        });
        test('recognizes "frontend/backend" description', () => {
            const description = 'This system requires both frontend application and backend services with REST API';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.patterns).toContainEqual(expect.objectContaining({ id: 'frontend-backend' }));
            expect(result.suggestions[0].patternId).toBe('frontend-backend');
        });
        test('recognizes "client/server" description', () => {
            const description = 'We need client-side UI with server-side processing capabilities';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.patterns).toContainEqual(expect.objectContaining({ id: 'frontend-backend' }));
        });
        test('recognizes mixed Chinese/English front-end/back-end terms', () => {
            const description = 'A mobile application (前端) and backend services (for data processing and API)';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.patterns).toContainEqual(expect.objectContaining({ id: 'frontend-backend' }));
        });
    });
    describe('FR-110.2: Multi-platform pattern recognition', () => {
        test('recognizes "ios/android" description', () => {
            const description = 'Need iOS and Android apps to reach both platforms';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.patterns).toContainEqual(expect.objectContaining({ id: 'multi-platform' }));
            expect(result.suggestions[0].suggestedChildren).toContainEqual({
                id: 'mobile',
                name: '移动应用',
                description: '支持iOS和Android的移动端应用'
            });
        });
        test('recognizes "移动端/PC端" description', () => {
            const description = '开发移动端APP和PC端网页版两个版本';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.patterns).toContainEqual(expect.objectContaining({ id: 'multi-platform' }));
            expect(result.suggestions[0].suggestedChildren).toContainEqual({
                id: 'web',
                name: 'Web应用',
                description: '基于浏览器的应用'
            });
        });
        test('recognizes "app/web" pattern', () => {
            const description = 'We need both native app features and responsive web experience';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.patterns).toContainEqual(expect.objectContaining({ id: 'multi-platform' }));
        });
    });
    describe('FR-110.3: Admin user pattern recognition', () => {
        test('recognizes "管理后台/用户端" pattern', () => {
            const description = '系统需要管理后台供管理员操作，同时有用户端供客户浏览';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.patterns).toContainEqual(expect.objectContaining({ id: 'admin-user' }));
            expect(result.suggestions[0].patternId).toBe('admin-user');
            expect(result.suggestions[0].suggestedChildren).toContainEqual({
                id: 'admin',
                name: '管理后台',
                description: '提供管理功能'
            });
            expect(result.suggestions[0].suggestedChildren).toContainEqual({
                id: 'user',
                name: '用户端',
                description: '面向用户的前端应用'
            });
        });
        test('recognizes "admin/user" pattern', () => {
            const description = 'An admin panel for administrators and a user interface for customers';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.patterns).toContainEqual(expect.objectContaining({ id: 'admin-user' }));
        });
        test('recognizes "后台/前台" pattern', () => {
            const description = '实现后台管理系统及前台用户门户';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.patterns).toContainEqual(expect.objectContaining({ id: 'admin-user' }));
        });
    });
    describe('FR-110.4: Ambiguous matching detection', () => {
        test('sets ambiguous flag when description matches multiple patterns', () => {
            const description = 'An admin dashboard (frontend) for managing users, plus separate mobile apps for both iOS and Android';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.ambiguous).toBe(true);
            // Should match both frontend/backend and multi-platform and admin/user
            expect(result.patterns).toHaveLength(3);
            const patternIds = result.patterns.map(p => p.id);
            expect(patternIds).toContain('frontend-backend');
            expect(patternIds).toContain('multi-platform');
            expect(patternIds).toContain('admin-user');
        });
        test('keeps ambiguous false when only one pattern matches', () => {
            const description = 'A simple web application with only frontend components';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.ambiguous).toBe(false);
        });
        test('case insensitive matching works for multi-patterns', () => {
            const description = 'IOS and ANDROID mobile APPS along with ADMIN controls';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.ambiguous).toBe(true);
            const patternIds = result.patterns.map(p => p.id);
            expect(patternIds).toContain('multi-platform');
            expect(patternIds).toContain('admin-user');
        });
    });
    describe('FR-110.5: No match scenarios', () => {
        test('returns null when no split patterns are found', () => {
            const description = 'Implement a simple calculator that adds two numbers';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).toBeNull();
        });
        test('returns null for general software that cannot be clearly split', () => {
            const description = 'A basic logging framework to track system events';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).toBeNull();
        });
        test('returns null when only general software terms are present', () => {
            const description = 'Build a robust authentication system for enterprise users';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).toBeNull();
        });
    });
    describe('Case sensitivity and variations', () => {
        test('handles capitalization variations', () => {
            const description = 'A MOBILE Application with BACKEND Services for API access';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
        });
        test('matches substrings and variations', () => {
            const description = 'Build both website frontend and database server backend solution';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.patterns[0].id).toBe('frontend-backend');
        });
        test('handles plural forms', () => {
            const description = 'We need mobile apps for ios users and android users';
            const result = workflowEngine.analyzeSplitSuggestion(description);
            expect(result).not.toBeNull();
            expect(result.patterns[0].id).toBe('multi-platform');
        });
    });
});
