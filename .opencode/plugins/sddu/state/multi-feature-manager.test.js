import { aggregateFeatureState, buildDependencyGraph, detectCircularDependency, isDependencyReady, getReadySubFeatures } from './multi-feature-manager';
describe('MultiFeatureManager Tests', () => {
    describe('aggregateFeatureState', () => {
        test('should return specified when no sub-features', () => {
            expect(aggregateFeatureState([])).toBe('specified');
        });
        test('should return slowest status among sub-features', () => {
            const subFeatures = [
                { id: 'sf1', status: 'completed', phase: 1 },
                { id: 'sf2', status: 'tasked', phase: 1 }, // slowest
                { id: 'sf3', status: 'validated', phase: 1 }
            ];
            expect(aggregateFeatureState(subFeatures)).toBe('tasked');
        });
        test('should work correctly when all same status', () => {
            const subFeatures = [
                { id: 'sf1', status: 'planned', phase: 1 },
                { id: 'sf2', status: 'planned', phase: 1 },
                { id: 'sf3', status: 'planned', phase: 1 }
            ];
            expect(aggregateFeatureState(subFeatures)).toBe('planned');
        });
        test('should correctly rank from slowest to fastest', () => {
            // Order: specified, planned, tasked, implementing, reviewed, validated, completed
            const allStatuses = [
                'specified', 'planned', 'tasked', 'implementing', 'reviewed', 'validated', 'completed'
            ];
            for (let i = 0; i < allStatuses.length; i++) {
                const slowest = allStatuses[i];
                const fasterStatuses = allStatuses.slice(i + 1).map((status, idx) => ({
                    id: `sf${idx}`,
                    status,
                    phase: 1
                }));
                const mixed = [{ id: 'slow', status: slowest, phase: 1 }, ...fasterStatuses];
                expect(aggregateFeatureState(mixed)).toBe(slowest);
            }
        });
    });
    describe('buildDependencyGraph', () => {
        test('should build dependency and blockedBy relations', () => {
            const subFeatures = [
                { id: 'a', status: 'specified', phase: 1 },
                { id: 'b', status: 'specified', phase: 1 },
                { id: 'c', status: 'specified', phase: 1 }
            ];
            const dependencies = {
                'b': ['a'], // b depends on a
                'c': ['b'] // c depends on b
            };
            const graph = buildDependencyGraph(subFeatures, dependencies);
            // Verify dependencies
            expect(graph.dependencies['a']).toEqual([]);
            expect(graph.dependencies['b']).toEqual(['a']);
            expect(graph.dependencies['c']).toEqual(['b']);
            // Verify blockedBy
            expect(graph.blockedBy['a']).toEqual(['b']); // a blocks b
            expect(graph.blockedBy['b']).toEqual(['c']); // b blocks c
            expect(graph.blockedBy['c']).toEqual([]); // c doesn't block anyone
        });
        test('should handle empty dependencies', () => {
            const subFeatures = [
                { id: 'a', status: 'specified', phase: 1 },
                { id: 'b', status: 'specified', phase: 1 }
            ];
            const dependencies = {};
            const graph = buildDependencyGraph(subFeatures, dependencies);
            expect(graph.dependencies).toEqual({
                'a': [],
                'b': []
            });
            expect(graph.blockedBy).toEqual({
                'a': [],
                'b': []
            });
        });
        test('should handle multiple dependencies', () => {
            const subFeatures = [
                { id: 'a', status: 'specified', phase: 1 },
                { id: 'b', status: 'specified', phase: 1 },
                { id: 'c', status: 'specified', phase: 1 },
                { id: 'd', status: 'specified', phase: 1 }
            ];
            const dependencies = {
                'c': ['a', 'b'], // c depends on both a and b
                'd': ['b'] // d depends only on b
            };
            const graph = buildDependencyGraph(subFeatures, dependencies);
            expect(graph.dependencies).toEqual({
                'a': [],
                'b': [],
                'c': ['a', 'b'],
                'd': ['b']
            });
            expect(graph.blockedBy).toEqual({
                'a': ['c'], // a blocks c
                'b': ['c', 'd'], // b blocks both c and d
                'c': [],
                'd': []
            });
        });
    });
    describe('detectCircularDependency', () => {
        test('should return null for acyclic dependencies', () => {
            const dependencies = {
                'b': ['a'],
                'c': ['b'],
                'd': ['c']
            };
            expect(detectCircularDependency('a', dependencies)).toBeNull();
            expect(detectCircularDependency('b', dependencies)).toBeNull();
            expect(detectCircularDependency('all', dependencies)).toBeNull();
        });
        test('should detect simple circular dependency', () => {
            const dependencies = {
                'a': ['b'],
                'b': ['a']
            };
            const cycle = detectCircularDependency('a', dependencies);
            expect(cycle).toEqual(['a', 'b', 'a']); // Cycle: a -> b -> a
        });
        test('should detect complex circular dependency', () => {
            const dependencies = {
                'a': ['b'],
                'b': ['c'],
                'c': ['a'] // Forms a -> b -> c -> a loop
            };
            const cycle = detectCircularDependency('a', dependencies);
            expect(cycle).toEqual(['a', 'b', 'c', 'a']);
        });
        test('should return when circular dependency exists through different path', () => {
            const dependencies = {
                'a': ['d'],
                'b': ['a'],
                'c': ['b'],
                'd': ['c'] // Completes a loop: d -> c -> b -> a -> d
            };
            const cycle = detectCircularDependency('d', dependencies);
            expect(cycle).toEqual(['d', 'c', 'b', 'a', 'd']);
        });
        test('should not find circular dependency in a DAG', () => {
            const dependencies = {
                'a': [], // independent
                'b': ['a'], // depends on a
                'c': ['a', 'b'], // depends on both a and b
                'd': ['c'] // depends only on c
            };
            expect(detectCircularDependency('d', dependencies)).toBeNull();
        });
        test('should handle case where node doesn\'t exist in dependency map', () => {
            const dependencies = {
                'a': ['b']
            };
            expect(detectCircularDependency('nonexistent', dependencies)).toBeNull();
        });
    });
    describe('isDependencyReady', () => {
        test('should return true when no dependencies', () => {
            const graph = {
                dependencies: { 'b': [] },
                blockedBy: {}
            };
            const statesMap = new Map();
            statesMap.set('b', { id: 'b', status: 'specified', phase: 1 });
            expect(isDependencyReady('b', graph, statesMap)).toBe(true);
        });
        test('should return true when all dependencies are planned', () => {
            const graph = {
                dependencies: { 'b': ['a'] },
                blockedBy: {}
            };
            const statesMap = new Map();
            statesMap.set('a', { id: 'a', status: 'planned', phase: 1 });
            statesMap.set('b', { id: 'b', status: 'specified', phase: 1 });
            expect(isDependencyReady('b', graph, statesMap)).toBe(true);
        });
        test('should return false when dependencies are not ready', () => {
            const graph = {
                dependencies: { 'b': ['a'] },
                blockedBy: {}
            };
            const statesMap = new Map();
            statesMap.set('a', { id: 'a', status: 'specified', phase: 1 }); // Not ready yet (not planned)
            statesMap.set('b', { id: 'b', status: 'specified', phase: 1 });
            expect(isDependencyReady('b', graph, statesMap)).toBe(false);
        });
        test('should return false when any dependency is not ready', () => {
            const graph = {
                dependencies: { 'c': ['a', 'b'] },
                blockedBy: {}
            };
            const statesMap = new Map();
            statesMap.set('a', { id: 'a', status: 'planned', phase: 1 }); // Ready
            statesMap.set('b', { id: 'b', status: 'specified', phase: 1 }); // Not ready
            statesMap.set('c', { id: 'c', status: 'specified', phase: 1 });
            expect(isDependencyReady('c', graph, statesMap)).toBe(false);
        });
        test('should return true when all dependencies meet minimum readiness', () => {
            const statusesAtleastPlanned = [
                'planned', 'tasked', 'implementing', 'reviewed', 'validated', 'completed'
            ];
            for (const status of statusesAtleastPlanned) {
                const graph = {
                    dependencies: { 'b': ['a'] },
                    blockedBy: {}
                };
                const statesMap = new Map();
                statesMap.set('a', { id: 'a', status, phase: 1 });
                statesMap.set('b', { id: 'b', status: 'specified', phase: 1 });
                expect(isDependencyReady('b', graph, statesMap)).toBe(true);
            }
        });
    });
    describe('getReadySubFeatures', () => {
        test('should return sub-features with no dependencies and unplanned blockers', () => {
            const graph = {
                dependencies: {
                    'b': ['a']
                },
                blockedBy: {
                    'c': ['d'] // c is blocked by d that is not yet planned
                }
            };
            const statesMap = new Map();
            statesMap.set('a', { id: 'a', status: 'planned', phase: 1 });
            statesMap.set('b', { id: 'b', status: 'specified', phase: 1 });
            statesMap.set('c', { id: 'c', status: 'specified', phase: 1 });
            statesMap.set('d', { id: 'd', status: 'specified', phase: 1 }); // Not planned, so blocks c
            const ready = getReadySubFeatures(graph, statesMap);
            // b: dep 'a' is ready, doesn't block others → ready
            // c: blocked by 'd' which isn't planned → not ready
            // a: no deps → ready
            // d: no deps but might be blocked → needs checking
            expect(ready).toContain('a');
            expect(ready).toContain('b'); // Should be available because a is planned
            expect(ready).not.toContain('c'); // Blocked by d which is not in planned state
            expect(ready).toContain('d');
        });
        test('should return empty when all sub-features blocked', () => {
            const graph = {
                dependencies: {
                    'b': ['a']
                },
                blockedBy: {
                    'a': ['c'] // Both 'a' and 'b' are blocked: 'a' by 'c', 'b' because its dep 'a' isn't ready
                }
            };
            const statesMap = new Map();
            statesMap.set('a', { id: 'a', status: 'specified', phase: 1 });
            statesMap.set('b', { id: 'b', status: 'specified', phase: 1 });
            statesMap.set('c', { id: 'c', status: 'specified', phase: 1 });
            const ready = getReadySubFeatures(graph, statesMap);
            expect(ready).toContain('c');
            expect(ready.length).toBe(1); // Only 'c' should be ready
        });
        test('should return sub-features when dependencies ready and no one blocks them', () => {
            const graph = {
                dependencies: {
                    'b': ['a']
                },
                blockedBy: {
                    'a': [],
                    'b': []
                }
            };
            const statesMap = new Map();
            statesMap.set('a', { id: 'a', status: 'planned', phase: 1 }); // Ready
            statesMap.set('b', { id: 'b', status: 'specified', phase: 1 });
            const ready = getReadySubFeatures(graph, statesMap);
            expect(ready).toEqual(expect.arrayContaining(['a', 'b'])); // Both should be available
        });
        test('should handle complex dependency and blocking scenario', () => {
            const graph = {
                dependencies: {
                    'b': ['a'],
                    'c': ['a'],
                    'd': ['b', 'c']
                },
                blockedBy: {
                    'a': [],
                    'b': ['e'], // 'b' is blocked by 'e'
                    'c': [],
                    'd': [],
                    'e': []
                }
            };
            const statesMap = new Map();
            statesMap.set('a', { id: 'a', status: 'planned', phase: 1 }); // Ready
            statesMap.set('b', { id: 'b', status: 'specified', phase: 1 }); // Dep ready, but blocked by 'e'
            statesMap.set('c', { id: 'c', status: 'specified', phase: 1 }); // Ready: dep 'a' is ready
            statesMap.set('d', { id: 'd', status: 'specified', phase: 1 }); // Not ready: 'b' and 'c' deps not satisfied properly
            statesMap.set('e', { id: 'e', status: 'specified', phase: 1 }); // Blocks 'b'
            const ready = getReadySubFeatures(graph, statesMap);
            expect(ready).toContain('a');
            expect(ready).toContain('c');
            expect(ready).toContain('e');
            expect(ready).not.toContain('b'); // Blocked by e which hasn't reached planned state
            expect(ready).not.toContain('d'); // Dependencies not ready
        });
    });
});
