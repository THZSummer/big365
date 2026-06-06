import { generateFeatureReadme, generateSubFeatureReadme } from './readme-generator';
// Basic tests without external framework
function runTests() {
    console.log('Running tests for readme-generator...');
    // Test 1: generateFeatureReadme with basic info
    const templateBasic = {
        featureName: 'User Authentication',
        description: 'Manages user authentication processes',
    };
    const basicResult = generateFeatureReadme(templateBasic);
    console.assert(basicResult.includes('# Feature: User Authentication'), 'Test 1 failed: Basic feature name not found');
    console.assert(basicResult.includes('Manages user authentication processes'), 'Test 1 failed: Description not found');
    console.log('✓ Test 1 passed: Basic feature README generation');
    // Test 2: generateFeatureReadme with sub features
    const templateWithSubFeatures = {
        featureName: 'API Gateway',
        subFeatures: [
            {
                id: 'auth',
                name: 'Authentication',
                dir: 'auth',
                status: 'In Progress',
                assignee: 'developer1'
            }
        ]
    };
    const subFeaturesResult = generateFeatureReadme(templateWithSubFeatures);
    console.assert(subFeaturesResult.includes('## 子 Feature 列表'), 'Test 2 failed: Sub features section not found');
    console.assert(subFeaturesResult.includes('[Authentication](auth/)'), 'Test 2 failed: Sub feature link not found');
    console.log('✓ Test 2 passed: Feature README with sub features');
    // Test 3: Empty sub features list
    const templateEmptySubFeatures = {
        featureName: 'Data Processing',
        subFeatures: []
    };
    const emptyResult = generateFeatureReadme(templateEmptySubFeatures);
    console.assert(emptyResult.includes('# Feature: Data Processing'), 'Test 3 failed: Feature name not found in empty case');
    console.assert(!emptyResult.includes('## 子 Feature 列表'), 'Test 3 failed: Sub features section should not exist');
    console.log('✓ Test 3 passed: Handling empty sub features list');
    // Test 4: SubFeature README generation
    const subFeatureInfo = {
        id: 'auth-001',
        name: 'User Login',
        dir: 'login',
        status: 'In Progress',
        assignee: 'dev-team',
        description: 'Handles user login functionality',
        scope: {
            included: ['Username/password auth'],
            excluded: ['Social login providers']
        },
        dependencies: {
            upstream: ['User Management'],
            downstream: ['Session Service']
        },
        interfaces: 'REST API endpoints'
    };
    const subFeatureResult = generateSubFeatureReadme(subFeatureInfo);
    console.assert(subFeatureResult.includes('# User Login'), 'Test 4 failed: Sub feature name not found');
    console.assert(subFeatureResult.includes('Handles user login functionality'), 'Test 4 failed: Sub feature description not found');
    console.assert(subFeatureResult.includes('Username/password auth'), 'Test 4 failed: Included scope not found');
    console.assert(subFeatureResult.includes('Social login providers'), 'Test 4 failed: Excluded scope not found');
    console.log('✓ Test 4 passed: Sub feature README generation');
    // Test 5: SubFeature with minimal info
    const minimalInfo = {
        id: 'min-001',
        name: 'Minimal Feature',
        dir: 'minimal',
        status: 'Not Started'
    };
    const minimalResult = generateSubFeatureReadme(minimalInfo);
    console.assert(minimalResult.includes('# Minimal Feature'), 'Test 5 failed: Minimal feature name not found');
    console.assert(minimalResult.includes('- 上游：-'), 'Test 5 failed: Default upstream dependency not found');
    console.assert(minimalResult.includes('- 下游：-'), 'Test 5 failed: Default downstream dependency not found');
    console.log('✓ Test 5 passed: Sub feature with minimal info');
    console.log('All tests passed!');
}
// Export the function too
export function testReadmeGenerator() {
    runTests();
}
// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    runTests();
}
