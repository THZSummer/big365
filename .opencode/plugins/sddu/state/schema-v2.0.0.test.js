import { validateState } from './schema-v2.0.0';
// Valid state example
const validState = {
    feature: 'test-feature',
    version: 'v2.0.0',
    status: 'building',
    phase: 4,
    phaseHistory: [
        {
            phase: 1,
            status: 'specified',
            timestamp: '2023-08-14T10:30:00Z',
            triggeredBy: 'sddu-spec-agent'
        },
        {
            phase: 2,
            status: 'planned',
            timestamp: '2023-08-15T11:00:00Z',
            triggeredBy: 'sddu-plan-agent'
        },
        {
            phase: 3,
            status: 'tasked',
            timestamp: '2023-08-16T09:45:00Z',
            triggeredBy: 'sddu-tasks-agent'
        },
        {
            phase: 4,
            status: 'building',
            timestamp: '2023-08-17T14:20:00Z',
            triggeredBy: 'sddu-build-agent'
        }
    ],
    files: {
        spec: '.sdd/spec.md',
        plan: '.sdd/plan.md',
        tasks: '.sdd/tasks.md',
        readme: 'README.md'
    },
    dependencies: {
        on: ['core-v2', 'auth-module'],
        blocking: ['feature-x', 'feature-y']
    },
    metadata: {
        priority: 'P0',
        featureId: 'test-feature',
        createdAt: '2023-08-14T10:00:00Z',
        updatedAt: '2023-08-17T14:20:00Z'
    },
    history: [
        {
            timestamp: '2023-08-14T10:30:00Z',
            from: undefined,
            to: 'specified',
            triggeredBy: 'sddu-spec-agent',
            comment: 'Initial specification completed',
            version: 'v2.0.0'
        }
    ]
};
describe('State Schema v2.0.0', () => {
    describe('validateState', () => {
        test('should validate a valid state object', () => {
            expect(validateState(validState)).toBe(true);
        });
        test('should reject invalid state (not an object)', () => {
            expect(validateState(null)).toBe(false);
            expect(validateState('invalid')).toBe(false);
            expect(validateState(123)).toBe(false);
        });
        test('should reject state without feature field', () => {
            const invalidState = { ...validState };
            delete invalidState.feature;
            expect(validateState(invalidState)).toBe(false);
        });
        test('should reject state with non-string feature field', () => {
            const invalidState = { ...validState, feature: 123 };
            expect(validateState(invalidState)).toBe(false);
        });
        test('should reject state without version field', () => {
            const invalidState = { ...validState };
            delete invalidState.version;
            expect(validateState(invalidState)).toBe(false);
        });
        test('should reject state with invalid status', () => {
            const invalidState = { ...validState, status: 'invalid-status' };
            expect(validateState(invalidState)).toBe(false);
        });
        test('should reject state with invalid phase', () => {
            const invalidState = { ...validState, phase: 7 }; // Phase out of range
            expect(validateState(invalidState)).toBe(false);
            const invalidState2 = { ...validState, phase: 0 }; // Phase out of range
            expect(validateState(invalidState2)).toBe(false);
        });
        test('should reject state with invalid phaseHistory', () => {
            const invalidState = { ...validState, phaseHistory: 'invalid' };
            expect(validateState(invalidState)).toBe(false);
        });
        test('should reject state with invalid phaseHistory items', () => {
            const invalidState = {
                ...validState,
                phaseHistory: [
                    {
                        phase: 'invalid', // Should be number
                        status: 'specified',
                        timestamp: '2023-08-14T10:30:00Z',
                        triggeredBy: 'test-agent'
                    }
                ]
            };
            expect(validateState(invalidState)).toBe(false);
        });
        test('should reject state without files field', () => {
            const invalidState = { ...validState };
            delete invalidState.files;
            expect(validateState(invalidState)).toBe(false);
        });
        test('should reject state without spec file', () => {
            const invalidState = { ...validState };
            delete invalidState.files.spec;
            expect(validateState(invalidState)).toBe(false);
        });
        test('should reject state with invalid dependencies', () => {
            const invalidState = { ...validState };
            delete invalidState.dependencies;
            expect(validateState(invalidState)).toBe(false);
            const invalidState2 = {
                ...validState,
                dependencies: {
                    on: 'invalid', // Should be array
                    blocking: []
                }
            };
            expect(validateState(invalidState2)).toBe(false);
        });
    });
    describe('StateV2_0_0 Interface', () => {
        test('should accept valid state object type', () => {
            const valid = validState;
            expect(valid).toBeDefined();
        });
    });
});
