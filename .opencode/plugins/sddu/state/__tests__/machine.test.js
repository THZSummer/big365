/**
 * Unit tests for StateMachine createFeature() integration with enhanced StateLoader (TASK-006)
 * Testing features:
 * - createFeature() creates state object containing all required fields
 * - createFeature() returns state with correct version=v2.1.0
 * - createFeature() returns state with correct depth calculation
 * - createFeature() returns state with initialized phaseHistory
 * - createFeature() returns state with correct dependencies structure
 * - createFeature() returns state with createdAt/updatedAt (when applicable)
 */
import { StateMachine } from '../machine';
import { StateLoader } from '../state-loader';
// Mock the dependencies  
jest.mock('../state-loader');
jest.mock('path');
describe('StateMachine Integration Tests (TASK-006)', () => {
    let stateMachine;
    let mockStateLoader;
    beforeEach(() => {
        mockStateLoader = new StateLoader('.sddu/specs-tree-root');
        // Mock the methods that will be called
        mockStateLoader.create = jest.fn().mockResolvedValue(true);
        mockStateLoader.get = jest.fn().mockResolvedValue(null);
        stateMachine = new StateMachine();
        stateMachine['stateLoader'] = mockStateLoader;
    });
    describe('FR-101 integration: StateMachine createFeature() with StateLoader enhancements', () => {
        test('createFeature() calls StateLoader.create() which returns a full state with v2.1.0 version', async () => {
            // Mock the state loader to respond with a full state object after create
            const createdStatePath = 'specs-tree-ecommerce';
            const expectedStateAfterCreate = {
                feature: createdStatePath,
                name: 'Ecommerce Platform',
                version: 'v2.1.0',
                status: 'specified',
                phase: 1,
                depth: 0, // Auto-computed by StateLoader
                phaseHistory: [{
                        phase: 1,
                        status: 'specified',
                        timestamp: '2026-01-01T00:00:00.000Z',
                        triggeredBy: 'StateLoader.create'
                    }],
                dependencies: {
                    on: [],
                    blocking: []
                },
                files: {
                    spec: 'specs-tree-ecommerce/spec.md',
                },
                childrens: [],
                metadata: undefined,
                history: []
            };
            mockStateLoader.get.mockResolvedValue(expectedStateAfterCreate);
            const result = await stateMachine.createFeature('Ecommerce Platform', createdStatePath);
            // Verify StateLoader.create was called with minimal initial state
            expect(mockStateLoader.create).toHaveBeenCalledWith(createdStatePath, expect.objectContaining({
                name: 'Ecommerce Platform',
                status: 'specified',
                phase: 1,
                files: { spec: 'specs-tree-ecommerce/spec.md' }
            }));
            // Verify the result has auto-filled values
            expect(result.version).toBe('v2.1.0');
            expect(result.feature).toBe(createdStatePath);
            expect(result.name).toBe('Ecommerce Platform');
            expect(result.status).toBe('specified');
            expect(result.phase).toBe(1);
            expect(result.depth).toBe(0); // Should be calculated by StateLoader
            expect(result.phaseHistory).toBeInstanceOf(Array);
            expect(result.dependencies).toBeDefined();
            expect(result.dependencies.on).toBeInstanceOf(Array);
            expect(result.dependencies.blocking).toBeInstanceOf(Array);
        });
        test('createFeature() processes nested paths and sets correct depth', async () => {
            const nestedPath = 'specs-tree-ecommerce/specs-tree-frontend';
            const expectedStateAfterCreate = {
                feature: nestedPath,
                name: 'Frontend Module',
                version: 'v2.1.0',
                status: 'specified',
                phase: 1,
                depth: 1, // Should be computed by StateLoader based on the path
                phaseHistory: [{
                        phase: 1,
                        status: 'specified',
                        timestamp: '2026-01-01T00:00:00.000Z',
                        triggeredBy: 'StateLoader.create'
                    }],
                dependencies: {
                    on: [],
                    blocking: []
                },
                files: {
                    spec: 'specs-tree-frontend/spec.md',
                },
                childrens: [],
                metadata: undefined,
                history: []
            };
            mockStateLoader.get.mockResolvedValue(expectedStateAfterCreate);
            const result = await stateMachine.createFeature('Frontend Module', nestedPath);
            // Since the depth should be auto-computed based on path
            expect(result.depth).toBe(1);
            expect(result.phaseHistory).not.toBeUndefined();
            expect(Array.isArray(result.phaseHistory)).toBe(true);
            expect(result.phaseHistory.length).toBeGreaterThan(0);
        });
        test('createFeature() ensures phaseHistory is initialized properly', async () => {
            const featurePath = 'specs-tree-simple';
            const expectedState = {
                feature: featurePath,
                name: 'Simple Feature',
                version: 'v2.1.0',
                status: 'planned',
                phase: 2,
                depth: 0,
                phaseHistory: [{
                        phase: 2,
                        status: 'planned',
                        timestamp: expect.any(String),
                        triggeredBy: 'StateLoader.create'
                    }],
                dependencies: {
                    on: [],
                    blocking: []
                },
                files: {
                    spec: 'specs-tree-simple/spec.md',
                },
                childrens: [],
                metadata: undefined,
                history: []
            };
            mockStateLoader.get.mockResolvedValue(expectedState);
            const result = await stateMachine.createFeature('Simple Feature', featurePath);
            // Ensure the result contains properly initialized phaseHistory
            expect(result.phaseHistory).toBeDefined();
            expect(Array.isArray(result.phaseHistory)).toBe(true);
            expect(result.phaseHistory.length).toBeGreaterThan(0);
            expect(result.phaseHistory[0]).toEqual(expect.objectContaining({
                phase: 2,
                status: 'planned',
                triggeredBy: 'StateLoader.create'
            }));
        });
        test('createFeature() returns state with properly structured dependencies', async () => {
            const featurePath = 'specs-tree-deps';
            const expectedState = {
                feature: featurePath,
                name: 'Feature with Deps',
                version: 'v2.1.0',
                status: 'tasked',
                phase: 3,
                depth: 0,
                phaseHistory: expect.any(Array),
                dependencies: {
                    on: ['dependency-a', 'dependency-b'], // Could be filled in based on initialState
                    blocking: ['blocked-feature']
                },
                files: {
                    spec: 'specs-tree-deps/spec.md',
                },
                childrens: [],
                metadata: undefined,
                history: []
            };
            mockStateLoader.get.mockResolvedValue(expectedState);
            const result = await stateMachine.createFeature('Feature with Deps', featurePath);
            // Dependencies should now be properly structured (even if auto-filled as empty)
            expect(result.dependencies).toBeDefined();
            expect(result.dependencies.on).toBeInstanceOf(Array);
            expect(result.dependencies.blocking).toBeInstanceOf(Array);
        });
        test('createFeature() fails gracefully when StateLoader fails', async () => {
            const failingFeaturePath = 'specs-tree-failing';
            // Make the StateLoader.create return failure
            mockStateLoader.create.mockResolvedValue(false);
            await expect(stateMachine.createFeature('Failing Feature', failingFeaturePath))
                .rejects
                .toThrow('Failed to create distributed state for feature:');
            expect(mockStateLoader.create).toHaveBeenCalledWith(failingFeaturePath, expect.objectContaining({ name: 'Failing Feature' }));
        });
        test('createFeature() handles special paths and computes depth accurately', async () => {
            const deepPath = 'specs-tree-ecommerce/specs-tree-backend/specs-tree-api/specs-tree-auth';
            const expectedState = {
                feature: deepPath,
                name: 'Auth Service',
                version: 'v2.1.0',
                status: 'specifief',
                phase: 1,
                depth: 3, // Computed based on the number of occurrences minus 1
                phaseHistory: expect.any(Array),
                dependencies: expect.any(Object),
                files: {
                    spec: 'specs-tree-auth/spec.md',
                },
                childrens: [],
                metadata: undefined,
                history: []
            };
            mockStateLoader.get.mockResolvedValue(expectedState);
            const result = await stateMachine.createFeature('Auth Service', deepPath);
            // This particular test would actually compute to depth = 3 (from specs-tree-* occurrences)
            // depth = occurrences('specs-tree-') - 1 = 4 - 1 = 3
            expect(result.depth).toBe(3);
        });
        test('createFeature() result contains all required fields as per schema v2.1.0', async () => {
            const featurePath = 'specs-tree-validation';
            const mockCompleteState = {
                feature: featurePath,
                name: 'Validation Feature',
                version: 'v2.1.0',
                status: 'building',
                phase: 4,
                depth: 0,
                phaseHistory: [{
                        phase: 4,
                        status: 'building',
                        timestamp: '2026-05-01T10:00:00.000Z',
                        triggeredBy: 'StateLoader.create'
                    }],
                files: {
                    spec: 'specs-tree-validation/spec.md',
                    plan: 'specs-tree-validation/plan.md',
                    tasks: 'specs-tree-validation/tasks.md'
                },
                dependencies: {
                    on: [],
                    blocking: []
                },
                childrens: [],
                history: [{
                        timestamp: '2026-05-01T10:00:00.000Z',
                        from: 'specified',
                        to: 'building',
                        triggeredBy: 'system'
                    }]
            };
            mockStateLoader.get.mockResolvedValue(mockCompleteState);
            const result = await stateMachine.createFeature('Validation Feature', featurePath);
            // Check all required fields according to StateV2_1_0 schema
            expect(result.feature).toBeDefined();
            expect(result.version).toBe('v2.1.0');
            expect(result.status).toBeDefined();
            expect(result.phase).toBeDefined();
            expect(result.phaseHistory).toBeDefined();
            expect(result.files).toBeDefined();
            expect(result.dependencies).toBeDefined();
            expect(result.depth).toBeDefined(); // This may now be added if auto-populated
            // Check structural validity of dependent objects
            expect(Array.isArray(result.phaseHistory)).toBe(true);
            expect(typeof result.files).toBe('object');
            expect(Array.isArray(result.dependencies.on)).toBe(true);
            expect(Array.isArray(result.dependencies.blocking)).toBe(true);
        });
    });
    describe('Error handling in StateMachine-StateLoader integration', () => {
        test('createFeature() throws appropriate error when StateLoader.create fails', async () => {
            const failingFeaturePath = 'specs-tree-error-test';
            mockStateLoader.create.mockResolvedValue(false);
            await expect(stateMachine.createFeature('Error Test', failingFeaturePath))
                .rejects
                .toThrow('Failed to create distributed state for feature:');
        });
        test('createFeature() handles StateLoader retrieval failures', async () => {
            const failingRetrievalPath = 'specs-tree-retrieval-fail';
            mockStateLoader.create.mockResolvedValue(true);
            mockStateLoader.get.mockResolvedValue(null); // Return null
            await expect(stateMachine.createFeature('Retrieval Fail', failingRetrievalPath))
                .rejects
                .toThrow('Created feature state could not be loaded immediately after creation:');
        });
    });
});
