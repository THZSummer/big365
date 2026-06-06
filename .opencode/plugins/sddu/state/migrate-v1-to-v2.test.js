import { migrateFromV1_2_11, isLegacyState } from './migrate-v1-to-v2';
import { validateState } from './schema-v2.0.0';
describe('Migration Utilities', () => {
    describe('isLegacyState', () => {
        test('should detect legacy state format correctly', () => {
            const legacyState = {
                featureId: 'test-feature',
                name: 'Test Feature',
                status: 'building',
                phase: 4,
                progress: 50,
                lastUpdated: '2023-08-14T10:30:00Z'
            };
            expect(isLegacyState(legacyState)).toBe(true);
            // Test with new state format
            const newState = {
                feature: 'test-feature',
                version: 'v2.0.0',
                status: 'building',
                phase: 4,
                phaseHistory: []
            };
            expect(isLegacyState(newState)).toBe(false);
            expect(isLegacyState(null)).toBe(false);
            expect(isLegacyState({})).toBe(false);
        });
    });
    describe('migrateFromV1_2_11', () => {
        test('should correctly migrate a legacy state', () => {
            const legacyState = {
                featureId: 'test-migration',
                name: 'Test Migration Feature',
                status: 'building',
                phase: 4,
                progress: 75,
                specPath: '.sdd/test/spec.md',
                planPath: '.sdd/test/plan.md',
                lastUpdated: '2023-08-14T10:30:00Z',
                dependencies: ['core-v1', 'auth-v2']
            };
            const migratedState = migrateFromV1_2_11(legacyState);
            // Validate the migrated state
            expect(validateState(migratedState)).toBe(true);
            // Check basic properties mapping
            expect(migratedState.feature).toBe(legacyState.featureId); // Changed key name
            expect(migratedState.name).toBe(legacyState.name);
            expect(migratedState.version).toBe('v2.0.0');
            expect(migratedState.status).toBe('building'); // Status mapped directly
            expect(migratedState.phase).toBe(legacyState.phase);
            // Check phaseHistory contains initial entry
            expect(migratedState.phaseHistory).toHaveLength(1);
            expect(migratedState.phaseHistory[0].phase).toBe(legacyState.phase);
            expect(migratedState.phaseHistory[0].status).toBe('building');
            expect(migratedState.phaseHistory[0].timestamp).toBe(legacyState.lastUpdated);
            expect(migratedState.phaseHistory[0].triggeredBy).toBe('migration-tool');
            // Check files mapping
            expect(migratedState.files.spec).toBe(legacyState.specPath);
            expect(migratedState.files.plan).toBe(legacyState.planPath);
            // Check dependencies mapping
            expect(migratedState.dependencies.on).toEqual(legacyState.dependencies || []);
            expect(migratedState.dependencies.blocking).toEqual([]);
            // Check history creation
            expect(migratedState.history).toHaveLength(1);
            expect(migratedState.history[0].timestamp).toBe(legacyState.lastUpdated);
            expect(migratedState.history[0].to).toBe('building');
            expect(migratedState.history[0].triggeredBy).toBe('migration-tool');
            expect(migratedState.history[0].comment).toBe('Initial migration from v1.2.11 to v2.0.0');
        });
        test('should handle missing optional fields gracefully', () => {
            const minimalLegacyState = {
                featureId: 'minimal-test',
                status: 'initiated',
                phase: 1,
                progress: 0,
                lastUpdated: '2023-08-14T10:30:00Z'
            };
            const migratedState = migrateFromV1_2_11(minimalLegacyState);
            expect(validateState(migratedState)).toBe(true);
            expect(migratedState.feature).toBe('minimal-test');
            expect(migratedState.name).toBeUndefined(); // Optional field
            expect(migratedState.files.spec).toContain('minimal-test'); // Fallback path
            expect(migratedState.dependencies.on).toEqual([]);
        });
        test('should map legacy status appropriately', () => {
            const legacyStatesWithMappings = [
                { legacyStatus: 'initiated', expectedNewStatus: 'specified' },
                { legacyStatus: 'draft', expectedNewStatus: 'specified' },
                { legacyStatus: 'planning', expectedNewStatus: 'planned' },
                { legacyStatus: 'designed', expectedNewStatus: 'planned' },
                { legacyStatus: 'inprogress', expectedNewStatus: 'building' },
                { legacyStatus: 'active', expectedNewStatus: 'building' },
                { legacyStatus: 'completed', expectedNewStatus: 'validated' },
                { legacyStatus: 'finished', expectedNewStatus: 'validated' },
            ];
            for (const testCase of legacyStatesWithMappings) {
                const legacyState = {
                    featureId: 'status-test',
                    status: testCase.legacyStatus,
                    phase: 1,
                    progress: 0,
                    lastUpdated: '2023-08-14T10:30:00Z',
                };
                const migratedState = migrateFromV1_2_11(legacyState);
                expect(migratedState.status).toBe(testCase.expectedNewStatus);
            }
        });
        test('should throw error if migrated state is invalid', () => {
            // Create a mocked legacy state that would produce invalid result
            const invalidLegacyState = {
                featureId: null, // Invalid - would cause validation failure
                status: 'building',
                phase: 3,
                progress: 50,
                lastUpdated: '2023-08-14T10:30:00Z'
            };
            expect(() => migrateFromV1_2_11(invalidLegacyState))
                .toThrow('Migrated state validation failed');
        });
    });
});
