import { validateState, isMultiMode, createInitialState } from './schema-v1.2.5';
// Mock console.assert or provide fallback to avoid runtime issues if not running in Node.js
if (typeof console === "undefined") {
    // @ts-ignore
    console = {
        assert: function (condition, message) {
            if (!condition) {
                // @ts-ignore
                throw new Error(message || "Assertion failed");
            }
        },
        log: function (...args) {
            // @ts-ignore
            print(args.join(" "));
        }
    };
}
// Simple test runner
class SimpleTestRunner {
    tests = [];
    passed = 0;
    failed = 0;
    testCase(name, fn) {
        this.tests.push({ name, fn });
    }
    async run() {
        for (const test of this.tests) {
            try {
                test.fn(); // Run sync tests
                console.log(`✓ ${test.name}`);
                this.passed++;
            }
            catch (error) {
                console.log(`✗ ${test.name}: ${error.message}`);
                this.failed++;
            }
        }
        console.log(`\nTests run: ${this.passed + this.failed}, Passed: ${this.passed}, Failed: ${this.failed}`);
        return this.failed === 0;
    }
}
const runner = new SimpleTestRunner();
// Helper function to create a valid state object for testing
const createValidState = () => ({
    feature: 'test-feature',
    name: 'Test Feature',
    version: '1.2.5',
    status: 'specified',
    mode: 'multi',
    files: {
        spec: 'specs-tree-root/test-feature/spec.md',
        plan: 'specs-tree-root/test-feature/plan.md',
        tasks: 'specs-tree-root/test-feature/tasks.md',
        readme: 'specs-tree-root/test-feature/README.md'
    },
    dependencies: {
        on: ['parent-feature'],
        blocking: ['other-feature']
    },
    subFeatures: [
        {
            id: 'sub-1',
            name: 'Sub Feature 1',
            dir: 'sub-features/sub-1',
            status: 'specified',
            stateFile: 'specs-tree-root/test-feature/sub-features/sub-1/.state.json',
            assignee: 'dev1'
        },
        {
            id: 'sub-2',
            dir: 'sub-features/sub-2',
            status: 'drafting',
            stateFile: 'specs-tree-root/test-feature/sub-features/sub-2/.state.json'
        }
    ],
    createdAt: '2026-03-31T12:00:00.000Z',
    updatedAt: '2026-03-31T12:00:00.000Z'
});
runner.testCase('validateState should validate correct state object', () => {
    const validState = createValidState();
    const result = validateState(validState);
    console.assert(result.valid, 'State should be valid');
    console.assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.join(', ')}`);
});
runner.testCase('validateState should reject object without feature field', () => {
    const invalidState = { version: '1.2.5', status: 'specified' };
    const result = validateState(invalidState);
    console.assert(!result.valid, 'State should be invalid');
    console.assert(result.errors.some(e => e.includes('feature must be a string')), `Expected feature validation error, got: ${result.errors.join(', ')}`);
});
runner.testCase('validateState should reject object with wrong version', () => {
    const invalidState = { feature: 'test-feature', version: '1.0.0', status: 'specified' };
    const result = validateState(invalidState);
    console.assert(!result.valid, 'State should be invalid');
    console.assert(result.errors.some(e => e.includes('version must be "1.2.5"')), `Expected version validation error, got: ${result.errors.join(', ')}`);
});
runner.testCase('validateState should reject object with invalid status', () => {
    const invalidState = { feature: 'test-feature', version: '1.2.5', status: 'invalid-status' };
    const result = validateState(invalidState);
    console.assert(!result.valid, 'State should be invalid');
    console.assert(result.errors.some(e => e.includes('status must be one of:')), `Expected status validation error, got: ${result.errors.join(', ')}`);
});
runner.testCase('validateState should handle invalid phase correctly', () => {
    const stateWithInvalidPhase = {
        ...createValidState(),
        phase: 10 // Outside the 1-6 range
    };
    const result = validateState(stateWithInvalidPhase);
    console.assert(!result.valid, 'State should be invalid with invalid phase');
    console.assert(result.errors.some(e => e.includes('phase must be a number between 1 and 6')), `Expected phase validation error, got: ${result.errors.join(', ')}`);
});
runner.testCase('validateState should validate subFeatures array correctly', () => {
    const stateWithInvalidSubFeat = {
        feature: 'test-feature',
        version: '1.2.5',
        status: 'specified',
        subFeatures: [
            {
                id: 'valid-id',
                // Missing 'dir', 'status', and 'stateFile'
            }
        ]
    };
    const result = validateState(stateWithInvalidSubFeat);
    console.assert(!result.valid, 'State should be invalid when subFeatures have missing fields');
    console.assert(result.errors.some(e => e.includes('subFeatures[0].dir must be a non-empty string')) &&
        result.errors.some(e => e.includes('subFeatures[0].status must be one of:')) &&
        result.errors.some(e => e.includes('subFeatures[0].stateFile must be a non-empty string')), `Expected subFeatures validation errors, got: ${result.errors.join(', ')}`);
});
runner.testCase('validateState should validate dependencies array items as strings', () => {
    const stateWithInvalidDeps = {
        ...createValidState(),
        dependencies: {
            on: ['valid-string', 123], // Second item is not a string
            blocking: ['also-valid']
        }
    };
    const result = validateState(stateWithInvalidDeps);
    console.assert(!result.valid, 'State should be invalid with non-string in dependencies');
    console.assert(result.errors.some(e => e.includes('dependencies.on[1] must be a string')), `Expected dependency validation error, got: ${result.errors.join(', ')}`);
});
runner.testCase('validateState should accept state with only required fields', () => {
    const minimalState = {
        feature: 'minimal-feature',
        version: '1.2.5',
        status: 'specified',
    };
    const result = validateState(minimalState);
    console.assert(result.valid, 'Minimal state should be valid');
    console.assert(result.errors.length === 0, `Expected no errors in minimal state, got: ${result.errors.join(', ')}`);
});
runner.testCase('isMultiMode should return true for multi mode with subFeatures', () => {
    const multiState = {
        feature: 'test-feature',
        version: '1.2.5',
        status: 'specified',
        mode: 'multi',
        subFeatures: [{
                id: 'sub1',
                dir: 'dir1',
                status: 'drafting',
                stateFile: 'state1'
            }]
    };
    console.assert(isMultiMode(multiState) === true, 'isMultiMode should return true for multi mode with subFeatures');
});
runner.testCase('isMultiMode should return false for single mode', () => {
    const singleState = {
        feature: 'test-feature',
        version: '1.2.5',
        status: 'specified',
        mode: 'single',
        subFeatures: [{
                id: 'sub1',
                dir: 'dir1',
                status: 'drafting',
                stateFile: 'state1'
            }]
    };
    console.assert(isMultiMode(singleState) === false, 'isMultiMode should return false for single mode');
});
runner.testCase('isMultiMode should return false for multi mode without subFeatures', () => {
    const multiEmptyState = {
        feature: 'test-feature',
        version: '1.2.5',
        status: 'specified',
        mode: 'multi',
        subFeatures: [] // Empty array
    };
    console.assert(isMultiMode(multiEmptyState) === false, 'isMultiMode should return false when subFeatures is empty');
});
runner.testCase('isMultiMode should return false when subFeatures is undefined', () => {
    const noSubFeatsState = {
        feature: 'test-feature',
        version: '1.2.5',
        status: 'specified',
        mode: 'multi',
        subFeatures: undefined
    };
    console.assert(isMultiMode(noSubFeatsState) === false, 'isMultiMode should return false when subFeatures is undefined');
});
runner.testCase('createInitialState should create initial state with all required fields', () => {
    const initialState = createInitialState('my-feature');
    // Check all required fields exist with correct types/values
    console.assert(initialState.feature === 'my-feature', 'Initial state should have correct feature name');
    console.assert(initialState.version === '1.2.5', 'Initial state should have correct version');
    console.assert(initialState.status === 'drafting', 'Initial state should have default status of drafting');
    console.assert(initialState.mode === 'multi', 'Initial state should have default mode of multi');
    // Check default file paths are correct
    const expectedFiles = {
        spec: 'specs-tree-root/my-feature/spec.md',
        plan: 'specs-tree-root/my-feature/plan.md',
        tasks: 'specs-tree-root/my-feature/tasks.md',
        readme: 'specs-tree-root/my-feature/README.md'
    };
    console.assert(JSON.stringify(initialState.files) === JSON.stringify(expectedFiles), 'Initial state files should match expected paths');
    // Check default dependencies
    const expectedDeps = { on: [], blocking: [] };
    console.assert(JSON.stringify(initialState.dependencies) === JSON.stringify(expectedDeps), 'Initial state dependencies should be empty arrays');
    // Check default subFeatures is empty array
    console.assert(Array.isArray(initialState.subFeatures) && initialState.subFeatures.length === 0, 'Initial state subFeatures should be empty array');
    // Check dates are valid date strings
    console.assert(typeof initialState.createdAt === 'string' && !isNaN(Date.parse(initialState.createdAt)), 'Initial state createdAt should be valid date string');
    console.assert(typeof initialState.updatedAt === 'string' && !isNaN(Date.parse(initialState.updatedAt)), 'Initial state updatedAt should be valid date string');
});
runner.testCase('createInitialState should set name when provided', () => {
    const initialState = createInitialState('my-feature', 'My Feature Name');
    console.assert(initialState.name === 'My Feature Name', 'Initial state should set provided name');
});
runner.testCase('createInitialState should create valid state according to schema', () => {
    const initialState = createInitialState('test-feature');
    const validation = validateState(initialState);
    console.assert(validation.valid, 'Initial state should be valid according to schema');
    console.assert(validation.errors.length === 0, `Expected no validation errors for initial state, got: ${validation.errors.join(', ')}`);
});
// Run all tests if this module is executed directly
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    (async () => {
        const success = await runner.run();
        if (typeof process !== 'undefined' && process.exit) {
            process.exit(success ? 0 : 1);
        }
    })();
}
export { runner };
