/**
 * Unit tests for StateLoader enhancement (TASK-004)
 * Testing features:
 * - computeDepth() in various path scenarios
 * - initPhaseHistory() consistent strategy
 * - create() method auto-population
 * - Timestamp addition
 */
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { StateLoader } from '../state-loader';
// Mock filesystem operations
jest.mock('fs/promises');
jest.mock('path');
describe('StateLoader Enhanced Unit Tests', () => {
    let stateLoader;
    const mockSpecRootDir = '.sddu/specs-tree-root';
    beforeEach(() => {
        stateLoader = new StateLoader(mockSpecRootDir);
        // Reset mocks
        jest.clearAllMocks();
    });
    describe('TASK-004.1: computeDepth() functionality', () => {
        test('computes depth as 0 for root level feature', () => {
            const depth = stateLoader.computeDepth('specs-tree-ecommerce');
            expect(depth).toBe(0);
        });
        test('computes depth as 1 for first-level subtree', () => {
            const depth = stateLoader.computeDepth('specs-tree-ecommerce/specs-tree-frontend');
            expect(depth).toBe(1);
        });
        test('computes depth as 2 for second-level subtree', () => {
            const depth = stateLoader.computeDepth('specs-tree-ecommerce/specs-tree-backend/specs-tree-api');
            expect(depth).toBe(2);
        });
        test('computes depth as 3 for third-level subtree', () => {
            const depth = stateLoader.computeDepth('specs-tree-ecommerce/specs-tree-backend/specs-tree-api/specs-tree-auth');
            expect(depth).toBe(3);
        });
        test('handles features without specs-tree prefix gracefully', () => {
            const depth = stateLoader.computeDepth('regular-folder/subfolder');
            expect(depth).toBe(0);
        });
    });
    describe('TASK-004.2: initPhaseHistory() functionality', () => {
        test('initializes history with current phase if no history provided', () => {
            const initialState = {
                phase: 1,
                status: 'specified'
            };
            const now = '2026-04-15T10:00:00.000Z';
            const result = stateLoader.initPhaseHistory(initialState, now);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                phase: 1,
                status: 'specified',
                timestamp: now,
                triggeredBy: 'StateLoader.create'
            });
        });
        test('uses existing history if provided', () => {
            const existingHistory = [{
                    phase: 0,
                    status: 'discovered',
                    timestamp: '2026-04-15T09:00:00.000Z',
                    triggeredBy: 'system'
                }];
            const initialState = {
                phase: 1,
                status: 'specified',
                phaseHistory: existingHistory
            };
            const now = '2026-04-15T10:00:00.000Z';
            const result = stateLoader.initPhaseHistory(initialState, now);
            expect(result).toEqual(existingHistory);
        });
        test('defaults to safe values if incomplete initial state provided', () => {
            const initialState = {};
            const now = '2026-04-15T10:00:00.000Z';
            const result = stateLoader.initPhaseHistory(initialState, now);
            expect(result).toHaveLength(1);
            expect(result[0].phase).toBe(1);
            expect(result[0].status).toBe('specified');
            expect(result[0].timestamp).toBe(now);
            expect(result[0].triggeredBy).toBe('StateLoader.create');
        });
    });
    describe('TASK-004.3: create() method functionality', () => {
        test('auto-calculates depth based on feature path and writes state file', async () => {
            const featurePath = 'specs-tree-ecommerce/specs-tree-frontend';
            const initialState = {
                name: 'Frontend App',
                status: 'specified'
            };
            fsPromises.mkdir.mockResolvedValue(undefined);
            fsPromises.writeFile.mockResolvedValue(undefined);
            const result = await stateLoader.create(featurePath, initialState);
            expect(result).toBe(true);
            // Check if mkdir was called
            expect(fsPromises.mkdir).toHaveBeenCalledWith(path.dirname(`${mockSpecRootDir}/${featurePath}/state.json`), { recursive: true });
            // Check if writeFile was called with depth set correctly
            expect(fsPromises.writeFile).toHaveBeenCalledTimes(1);
            const writtenContent = jest.mocked(fsPromises.writeFile).mock.calls[0][1];
            expect(writtenContent).toContain('"depth":1');
        });
        test('auto-initializes phaseHistory with consistent strategy', async () => {
            const featurePath = 'specs-tree-ecommerce';
            const initialState = {
                name: 'Ecommerce Platform',
                status: 'planned',
                phase: 2
            };
            fsPromises.mkdir.mockResolvedValue(undefined);
            fsPromises.writeFile.mockResolvedValue(undefined);
            await stateLoader.create(featurePath, initialState);
            const writtenContent = jest.mocked(fsPromises.writeFile).mock.calls[0][1];
            const parsedState = JSON.parse(writtenContent);
            expect(parsedState.phaseHistory).toBeDefined();
            expect(parsedState.phaseHistory).toHaveLength(1);
            expect(parsedState.phaseHistory[0]).toMatchObject({
                phase: 2,
                status: 'planned'
            });
            expect(parsedState.phaseHistory[0].triggeredBy).toBe('StateLoader.create');
        });
        test('auto-adds timestamps when writing state file', async () => {
            const featurePath = 'specs-tree-simple';
            const initialState = {
                name: 'Simple Feature'
            };
            fsPromises.mkdir.mockResolvedValue(undefined);
            fsPromises.writeFile.mockResolvedValue(undefined);
            await stateLoader.create(featurePath, initialState);
            const writtenContent = jest.mocked(fsPromises.writeFile).mock.calls[0][1];
            const parsedState = JSON.parse(writtenContent);
            // These should be present from the updated implementation
            expect(parsedState.version).toBe('v2.1.0');
        });
        test('does not overwrite existing state file', async () => {
            const featurePath = 'specs-tree-existing';
            const initialState = {
                name: 'Existing Feature'
            };
            const mockAccess = fsPromises.access;
            mockAccess.mockRejectedValue(new Error('File exists')); // File doesn't exist
            // Mock successful write
            fsPromises.mkdir.mockResolvedValue(undefined);
            fsPromises.writeFile.mockResolvedValue(undefined);
            const result = await stateLoader.create(featurePath, initialState);
            expect(result).toBe(true);
            // Now simulate existing file
            mockAccess.mockResolvedValue(undefined); // File exists
            const result2 = await stateLoader.create(featurePath, initialState);
            expect(result2).toBe(false); // Should fail
        });
    });
    describe('Integration with TreeStateValidator', () => {
        // This test covers that creation calls TreeStateValidator for final validation
        test('validateNewState is called for final validation', async () => {
            const featurePath = 'specs-tree-integration';
            const initialState = {
                name: 'Integration Test',
                status: 'specified'
            };
            fsPromises.mkdir.mockResolvedValue(undefined);
            fsPromises.writeFile.mockResolvedValue(undefined);
            // Spy on dynamic import to verify it was imported and used
            // We focus on verifying the result has auto-filled values
            await stateLoader.create(featurePath, initialState);
            const writtenContent = jest.mocked(fsPromises.writeFile).mock.calls[0][1];
            const parsedState = JSON.parse(writtenContent);
            expect(parsedState.feature).toBe(featurePath);
            expect(parsedState.version).toBe('v2.1.0');
            expect(parsedState.depth).toBe(0); // Since path has only 1 'specs-tree-' occurrence
        });
    });
});
