// State Schema v2.0.0
// Defines the structure for distributed workflow state management
// Validation function for v2.0.0
export function validateState(state) {
    // Required fields validation
    if (!state || typeof state !== 'object') {
        console.error('State must be an object');
        return false;
    }
    // Validate feature field
    if (!state.feature || typeof state.feature !== 'string') {
        console.error('feature must be a non-empty string');
        return false;
    }
    // Validate version field
    if (!state.version || typeof state.version !== 'string') {
        console.error('version must be a non-empty string');
        return false;
    }
    // Validate status field
    const validStatuses = ['specified', 'planned', 'tasked', 'building', 'reviewed', 'validated'];
    if (!validStatuses.includes(state.status)) {
        console.error('status must be one of the valid workflow statuses');
        return false;
    }
    // Validate phase field
    if (typeof state.phase !== 'number' || state.phase < 1 || state.phase > 6) {
        console.error('phase must be a number between 1 and 6');
        return false;
    }
    // Validate phaseHistory field
    if (!Array.isArray(state.phaseHistory)) {
        console.error('phaseHistory must be an array');
        return false;
    }
    for (const historyItem of state.phaseHistory) {
        if (!historyItem ||
            typeof historyItem !== 'object' ||
            typeof historyItem.phase !== 'number' ||
            typeof historyItem.status !== 'string' ||
            typeof historyItem.timestamp !== 'string' ||
            typeof historyItem.triggeredBy !== 'string') {
            console.error('Each phaseHistory item must have phase(number), status(string), timestamp(string), and triggeredBy(string)');
            return false;
        }
        if (!validStatuses.includes(historyItem.status)) {
            console.error('Phase history status must be one of the valid workflow statuses');
            return false;
        }
        if (historyItem.phase < 1 || historyItem.phase > 6) {
            console.error('Phase history phase must be between 1 and 6');
            return false;
        }
    }
    // Validate files field
    if (!state.files || typeof state.files !== 'object') {
        console.error('files must be an object');
        return false;
    }
    if (typeof state.files.spec !== 'string') {
        console.error('files.spec must be a string');
        return false;
    }
    // Validate dependencies field
    if (!state.dependencies || typeof state.dependencies !== 'object') {
        console.error('dependencies must be an object');
        return false;
    }
    if (!Array.isArray(state.dependencies.on) || !Array.isArray(state.dependencies.blocking)) {
        console.error('dependencies.on and dependencies.blocking must be arrays');
        return false;
    }
    // Additional checks based on status and phase relationship
    if (state.phase === 1 && state.status !== 'specified') {
        console.warn('Phase 1 should typically have "specified" status');
    }
    else if (state.phase === 2 && state.status !== 'planned') {
        console.warn('Phase 2 should typically have "planned" status');
    }
    else if (state.phase === 3 && state.status !== 'tasked') {
        console.warn('Phase 3 should typically have "tasked" status');
    }
    else if (state.phase === 4 && state.status !== 'building') {
        console.warn('Phase 4 should typically have "building" status');
    }
    else if (state.phase === 5 && state.status !== 'reviewed') {
        console.warn('Phase 5 should typically have "reviewed" status');
    }
    else if (state.phase === 6 && state.status !== 'validated') {
        console.warn('Phase 6 should typically have "validated" status');
    }
    return true;
}
// Extended validation function for v2.1.0 schema
export function validateStateV2_1_0(state) {
    // First validate using the v2.0.0 validation
    if (!validateState(state)) {
        return false;
    }
    // Validate version field specific to v2.1.0 - fix: check against v2.1.0 specifically
    if (state.version !== 'v2.1.0') {
        console.error('Version must be "v2.1.0" for StateV2_1_0');
        return false;
    }
    // For v2.1.0, we can validate fields that are available in StateV2_1_0 vs StateV2_0_0
    // Since we extend from StateV2_0_0, the base validation happens in validateState
    // Special v2.1.0 validations:
    // Only validate depth and childrens if they exist in the object (they're optional)
    if ('depth' in state && state.depth !== undefined) {
        if (typeof state.depth !== 'number' || state.depth < 0) {
            console.error('depth must be a non-negative number when present');
            return false;
        }
    }
    if ('childrens' in state && state.childrens !== undefined) {
        if (!Array.isArray(state.childrens)) {
            console.error('childrens must be an array when present');
            return false;
        }
        for (const child of state.childrens) {
            if (!child || typeof child !== 'object') {
                console.error('Each child in childrens must be an object');
                return false;
            }
            if (typeof child.path !== 'string') {
                console.error('Each child must have a path string');
                return false;
            }
            if (typeof child.featureName !== 'string') {
                console.error('Each child must have a featureName string');
                return false;
            }
            const validStatuses = ['specified', 'planned', 'tasked', 'building', 'reviewed', 'validated'];
            if (!validStatuses.includes(child.status)) {
                console.error('Each child status must be one of the valid workflow statuses');
                return false;
            }
            if (typeof child.phase !== 'number' || child.phase < 1 || child.phase > 6) {
                console.error('Each child phase must be a number between 1 and 6');
                return false;
            }
            if (typeof child.lastModified !== 'string') {
                console.error('Each child must have a lastModified timestamp string');
                return false;
            }
        }
    }
    return true;
}
