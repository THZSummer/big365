import { isDependencyReady, notifyDependencyReady, findDependentSubFeatures, createDefaultConfig } from './dependency-notifier';
// Mock console.log to capture outputs
let consoleOutput = [];
const originalLog = console.log;
beforeEach(() => {
    consoleOutput = [];
    console.log = (...args) => {
        consoleOutput.push(args.join(' '));
    };
});
afterEach(() => {
    console.log = originalLog;
});
describe('Dependency Notifier', () => {
    describe('isDependencyReady', () => {
        it('should return true when no dependencies exist', () => {
            const result = isDependencyReady('featureA', {}, new Map());
            expect(result).toBe(true);
        });
        it('should return true when a dependency is in planning phase or higher', () => {
            const dependencies = { featureC: ['featureA', 'featureB'] };
            const states = new Map([
                ['featureA', { status: 'planned', phase: 2 }],
                ['featureB', { status: 'tasked', phase: 3 }]
            ]);
            const result = isDependencyReady('featureC', dependencies, states);
            expect(result).toBe(true);
        });
        it('should return false when a dependency is not ready (has phase < 2)', () => {
            const dependencies = { featureC: ['featureA', 'featureB'] };
            const states = new Map([
                ['featureA', { status: 'planned', phase: 2 }],
                ['featureB', { status: 'specified', phase: 1 }]
            ]);
            const result = isDependencyReady('featureC', dependencies, states);
            expect(result).toBe(false);
        });
        it('should return false for non-existent dependency', () => {
            const dependencies = { featureC: ['featureA', 'featureB'] };
            const states = new Map([
                ['featureA', { status: 'planned', phase: 2 }]
                // featureB is not in the map!
            ]);
            const result = isDependencyReady('featureC', dependencies, states);
            expect(result).toBe(false);
        });
    });
    describe('findDependentSubFeatures', () => {
        it('should return features that depend on the specified sub-feature', () => {
            const dependencies = {
                featureB: ['featureA'],
                featureC: ['featureA', 'featureD'],
                featureD: [], // Does not depend on anyone
                featureE: ['featureZ'] // Depends on someone else
            };
            const result = findDependentSubFeatures('featureA', dependencies);
            expect(result).toEqual(['featureB', 'featureC']);
        });
        it('should return empty array if no features depend on the specified sub-feature', () => {
            const dependencies = {
                featureB: ['featureX'],
                featureC: ['featureY']
            };
            const result = findDependentSubFeatures('featureA', dependencies);
            expect(result).toEqual([]);
        });
        it('should return correct values with complex graph', () => {
            const dependencies = {
                frontend: ['api', 'auth'],
                backend: ['database'],
                auth: ['database'],
                api: ['database'],
                dashboard: ['frontend', 'backend']
            };
            const result = findDependentSubFeatures('database', dependencies);
            expect(result).toEqual(['backend', 'auth', 'api']);
            const result2 = findDependentSubFeatures('auth', dependencies);
            expect(result2).toEqual(['frontend']);
            const result3 = findDependentSubFeatures('nonexistent', dependencies);
            expect(result3).toEqual([]);
        });
    });
    describe('notifyDependencyReady', () => {
        it('should not notify when disabled in config', async () => {
            const dependencies = { featureB: ['featureA'] };
            const states = new Map([
                ['featureA', { status: 'tasked', phase: 3 }],
                ['featureB', { status: 'specified', phase: 1 }]
            ]);
            const config = {
                enabled: false,
                logToConsole: true
            };
            const result = await notifyDependencyReady('featureA', dependencies, states, config);
            expect(result.notified).toBe(false);
            expect(consoleOutput).toHaveLength(0);
        });
        it('should notify when dependent becomes ready due to the completed feature', async () => {
            const dependencies = {
                featureB: ['featureA'], // When featureA completes, featureB becomes able to start
                featureC: ['featureX'] // This won't be triggered by changing featureA 
            };
            const states = new Map([
                ['featureA', { status: 'planned', phase: 2 }], // featureA just became ready
                ['featureB', { status: 'planned', phase: 2 }], // Now with featureA also ready, B is completely ready
                ['featureC', { status: 'specified', phase: 1 }] // C still needs X which is not yet ready
            ]);
            const result = await notifyDependencyReady('featureA', dependencies, states);
            expect(result.notified).toBe(true);
            expect(result.readySubFeatures).toContain('featureB');
            expect(consoleOutput.some(msg => msg.includes('featureB'))).toBe(true);
        });
        it('should call the custom callback when dependencies become ready', async () => {
            const mockCallback = jest.fn();
            const config = {
                enabled: true,
                onDependencyReady: mockCallback
            };
            const dependencies = {
                featureB: ['featureA']
            };
            const states = new Map([
                ['featureA', { status: 'planned', phase: 2 }], // Just became available
                ['featureB', { status: 'planned', phase: 2 }] // Dependencies now satisfied!
            ]);
            await notifyDependencyReady('featureA', dependencies, states, config);
            expect(mockCallback).toHaveBeenCalledWith('featureB', ['featureA']); // featureB's dependencies: ['featureA']
        });
        it('should handle empty cases gracefully', async () => {
            const dependencies = {};
            const states = new Map();
            const result = await notifyDependencyReady('featureA', dependencies, states);
            expect(result.notified).toBe(false);
            expect(result.readySubFeatures).toEqual([]);
            expect(result.message).toBe('没有其他子特性依赖 "featureA"');
        });
    });
    describe('createDefaultConfig', () => {
        it('should return proper default configuration', () => {
            const config = createDefaultConfig();
            expect(config.enabled).toBe(true);
            expect(config.logToConsole).toBe(true);
            expect(typeof config.onDependencyReady).toBe('function');
            // Mock global console for testing the callback
            const spy = jest.fn();
            global.console = { log: spy };
            config.onDependencyReady('test123', ['dep1', 'dep2']);
            expect(spy).toHaveBeenCalledWith('📢 子 Feature "test123" 的依赖已就绪，可以开始开发: dep1, dep2');
        });
    });
    describe('integration tests', () => {
        it('should properly handle a complex dependency scenario', async () => {
            const dependencies = {
                frontend: ['api', 'auth'], // frontend needs both api and auth
            };
            // When notifyDependencyReady is called for 'api', it means 'api' just became ready,
            // so the states should include 'api' as being ready / in proper phase
            const states = new Map([
                ['database', { status: 'tasked', phase: 3 }],
                ['network', { status: 'tasked', phase: 3 }],
                ['auth', { status: 'tasked', phase: 3 }], // auth is ready
                ['api', { status: 'tasked', phase: 3 }], // api JUST became ready (passed as first param)
                ['frontend', { status: 'planned', phase: 2 }], // frontend needed both api and auth - BOTH ARE NOW READY!
                ['notification_service', { status: 'planned', phase: 2 }]
            ]);
            // notification occurs when 'api' completes, and the states reflect its completion
            const resultIntegration = await notifyDependencyReady('api', dependencies, states);
            // frontend was waiting for ['api', 'auth']
            // At the moment of notification: 
            //   - auth was already ready (phase >= 2) from states
            //   - api was just made ready (by being passed to function + in states as ready)
            // So now frontend has both deps ready, meaning frontend is ready to start working
            expect(resultIntegration.readySubFeatures).toContain('frontend');
        });
        it('should handle scenario where finishing one sub-feature makes others ready', async () => {
            const dependencies = {
                service2: ['service1'],
                service3: ['service1'],
                service4: ['service2'],
                service5: ['service3', 'service4'] // depends on service3 and service4, which in turn depend on service1 and service2 respectively
            };
            // Simulate all services have all prereqs except the one being completed now
            const states = new Map([
                ['service1', { status: 'planned', phase: 2 }], // Just marked service1 as planned -> it's now "completed"/available
                ['service2', { status: 'planned', phase: 2 }], // Waiting for service1
                ['service3', { status: 'planned', phase: 2 }], // Waiting for service1
                ['service4', { status: 'planned', phase: 2 }], // Waiting for service2
                ['service5', { status: 'planned', phase: 2 }] // Waiting for service3 AND service4
            ]);
            // Now, when service1 gets finished:
            const result = await notifyDependencyReady('service1', dependencies, states);
            // Both service2 and service3 had service1 as a dep, and all others were satisfied
            expect(result.readySubFeatures).toContain('service2');
            expect(result.readySubFeatures).toContain('service3');
            // However service4 and service5 should not be ready because even though service1 is ready,
            //   service2 hasn't become ready yet (it just became ready, but result doesn't show this until next check)
            // The function only evaluates the dependency readiness as of now for features that depended on service1
            // service4 depends on service2, and when service1 was completed, service2 was not yet known to be ready (only just becoming ready)
            // service5 depends on service3 and service4
            expect(result.readySubFeatures).not.toContain('service4'); // because it depends on service2, which didn't become ready at this point per dependencies (service2 waits on service1, just became available)
            expect(result.readySubFeatures).not.toContain('service5'); // because service 4 not yet available
            // Actually upon second thought, it works this way:
            // service1 finishes, service2 and service3 become ready immediately due to dependencies satisfied
            // This function does not subsequently trigger cascade notifications,
            // i.e., it does not automatically evaluate service4 (wait for 2)  or service5 (wait for 3,4)
            // Those would be notified in subsequent calls for service2 and service3 respectively
        });
    });
    describe('edge case and coverage tests', () => {
        it('should handle the case when there are no affected sub-features due to this completion', async () => {
            const dependencies = {
                frontend: ['api', 'auth'], // Does not depend on serviceX
                backend: ['database']
            };
            const states = new Map([
                ['database', { status: 'completed', phase: 5 }],
                ['api', { status: 'validated', phase: 4 }],
                ['auth', { status: 'validated', phase: 4 }],
                ['serviceX', { status: 'tasked', phase: 3 }] // serviceX just finished but noone depends on it
            ]);
            // serviceX finishes but noone was waiting for it
            const result = await notifyDependencyReady('serviceX', dependencies, states);
            expect(result.notified).toBe(false);
            expect(result.readySubFeatures).toEqual([]);
            expect(result.message).toContain('没有其他子特性依赖');
        });
        it('should handle the browser env fallback path for logging', () => {
            // Temporarily mock different environments
            const originalConsole = global.console;
            const originalProcess = global.process;
            // Remove console and process to test fallback
            Object.defineProperty(global, 'console', {
                value: undefined,
                writable: true,
                configurable: true
            });
            delete global.process;
            const originalConfig = createDefaultConfig();
            // Re-create config with the modified global context
            const config = { ...originalConfig };
            try {
                // Attempt to call the logging function
                config.onDependencyReady('test-feature', ['dep1']);
            }
            finally {
                // Restore original values
                global.console = originalConsole;
                global.process = originalProcess;
            }
        });
        it('should handle the case where dependent feature is not fully ready', async () => {
            // Similar to first test, but make sure one dependency is ready and another isn't
            const dependencies = {
                featureB: ['featureA', 'featureC'] // featureB needs both A and C
            };
            const states = new Map([
                ['featureA', { status: 'tasked', phase: 3 }], // Ready
                ['featureC', { status: 'specified', phase: 1 }], // Not ready
                ['featureB', { status: 'planned', phase: 2 }] // Waiting on both A and C
            ]);
            // featureA completes, but it's still not enough for featureB
            const result = await notifyDependencyReady('featureA', dependencies, states);
            // featureB still needs featureC before it can be ready
            expect(result.notified).toBe(false);
            expect(result.readySubFeatures).toEqual([]);
            expect(result.message).toContain('但没有其他依赖它的子特性达到就绪状态');
        });
        it('should respect custom configuration options', async () => {
            const mockCallback = jest.fn();
            const config = {
                enabled: true,
                logToConsole: false, // Should not log to console
                onDependencyReady: mockCallback
            };
            const dependencies = { featureB: ['featureA'] };
            const states = new Map([
                ['featureA', { status: 'tasked', phase: 3 }],
                ['featureB', { status: 'tasked', phase: 3 }] // Dependencies satisfied
            ]);
            // Execute notification
            const result = await notifyDependencyReady('featureA', dependencies, states, config);
            // Verify callback was called but defaults weren't
            expect(result.notified).toBe(true);
            expect(mockCallback).toHaveBeenCalled();
            // Clean up mock
            mockCallback.mockReset();
        });
        it('should handle node env process.stdout path for logging', () => {
            // Temporarily mock different environments
            const originalConsole = global.console;
            const originalProcess = global.process;
            // Remove console but keep process to test process.stdout path
            Object.defineProperty(global, 'console', {
                value: { log: undefined }, // console exists but log is undefined
                writable: true,
                configurable: true
            });
            // Keep process and process.stdout
            Object.defineProperty(global, 'process', {
                value: { stdout: { write: jest.fn() } },
                writable: true,
                configurable: true
            });
            const originalConfig = createDefaultConfig();
            // Execute the logging function
            originalConfig.onDependencyReady('test-feature', ['dep1']);
            // Verify that process.stdout.write was called
            expect(global.process.stdout.write).toHaveBeenCalledWith('📢 子 Feature "test-feature" 的依赖已就绪，可以开始开发: dep1\n');
            // Clean up
            global.console = originalConsole;
            global.process = originalProcess;
        });
        it('should handle circular dependencies gracefully during checks', () => {
            // Though we might have circular dependencies elsewhere, 
            // this function checks individual dependencies at face value
            const dependencies = {
                A: ['B'],
                B: ['A'] // Circular
            };
            const states = new Map([
                ['A', { status: 'tasked', phase: 3 }],
                ['B', { status: 'tasked', phase: 3 }]
            ]);
            const resultA = isDependencyReady('A', dependencies, states); // Checks deps of A
            const resultB = isDependencyReady('B', dependencies, states); // Checks deps of B
            expect(resultA).toBe(true); // Because B is in phase 3
            expect(resultB).toBe(true); // Because A is in phase 3
        });
    });
});
