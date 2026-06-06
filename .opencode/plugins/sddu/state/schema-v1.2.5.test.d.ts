declare class SimpleTestRunner {
    private tests;
    private passed;
    private failed;
    testCase(name: string, fn: () => void): void;
    run(): Promise<boolean>;
}
declare const runner: SimpleTestRunner;
export { runner };
