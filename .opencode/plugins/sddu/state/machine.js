// 状态机实现 - 带流程防跳过验证
import * as fs from 'fs/promises';
import * as path from 'path';
import { validateState, validateStateV2_1_0 } from './schema-v2.0.0';
import { DependencyChecker } from './dependency-checker';
import { StateLoader } from './state-loader';
// 导出 DependencyChecker 和 StateLoader 以便其他模块使用
export { DependencyChecker, StateLoader };
export { // New export
validateState };
export class StateMachine {
    stateLoader;
    specsDir;
    dependencyChecker;
    // Hook for Agent workflow integration
    agentHook;
    // Updated state workflow rules for Agent integration
    validTransitions = {
        'drafting': ['discovered', 'specified'], // Allow direct transition or discovery-first
        'discovered': ['specified'], // discovery produces spec-ready state
        'specified': ['planned'], // spec leads to planning (Phase 1→2)
        'planned': ['tasked'], // planning leads to task breakdown (Phase 2→3)
        'tasked': ['implementing'], // tasks assigned to implementation (Phase 3→4)
        'implementing': ['reviewed'], // implementation needs review (Phase 4→5)
        'reviewed': ['validated'], // review leads to validation (Phase 5→6)
        'validated': ['completed'], // validation completes the feature (6→end)
        'completed': [] // Final state
    };
    // Required files for each state - updated for agent workflow
    requiredFiles = {
        'drafting': [],
        'discovered': ['discovery.md'],
        'specified': ['spec.md', 'discovery.md'],
        'planned': ['spec.md', 'plan.md', 'discovery.md'],
        'tasked': ['spec.md', 'plan.md', 'tasks.md', 'discovery.md'],
        'implementing': ['spec.md', 'plan.md', 'tasks.md', 'discovery.md'],
        'reviewed': ['spec.md', 'plan.md', 'tasks.md', 'review.md', 'discovery.md'],
        'validated': ['spec.md', 'plan.md', 'tasks.md', 'review.md', 'validation.md', 'discovery.md'],
        'completed': ['spec.md', 'plan.md', 'tasks.md', 'review.md', 'validation.md', 'discovery.md']
    };
    constructor(specsDir = '.sddu/specs-tree-root') {
        this.specsDir = specsDir;
        this.stateLoader = new StateLoader(specsDir); // Initialize the StateLoader
    }
    // Set the agent hook for workflow integration
    setAgentHook(hook) {
        this.agentHook = hook;
    }
    // Set the dependency checker for state validation
    setDependencyChecker(checker) {
        this.dependencyChecker = checker;
    }
    async load(featurePath) {
        // Now the StateMachine uses distributed loading - either load a specific featurePath or return empty set if no feature specified
        // Since this is called by various operations, the logic will now come from the stateLoader
        if (featurePath) {
            return await this.stateLoader.get(featurePath);
        }
        // In a distributed system, individual loading is done through stateLoader per feature path
        return null;
    }
    async save() {
        // Save operations now are handled distributed through stateLoader, this is now a no-op for the centralized file
        console.warn("Using StateLoader for distributed saving, no centralized save operation");
        // For backward compatibility - keeping this function but it does nothing now
    }
    async createFeature(name, featurePath) {
        const id = name.toLowerCase().replace(/\s+/g, '-').slice(0, 50);
        // Create minimal initial state - let StateLoader auto-fill the rest (FR-103)
        const initialState = {
            feature: featurePath,
            name: name,
            status: 'specified', // Base status on which phase is initially set
            phase: 1, // Initial phase set to 1 (spec phase)
            files: {
                spec: `${path.basename(featurePath)}/spec.md` // Minimal required file info
            }
        };
        // Save via StateLoader - auto-fill all missing properties (FR-101, FR-103)
        const success = await this.stateLoader.create(featurePath, initialState);
        if (!success) {
            throw new Error('Failed to create distributed state for feature: ' + id);
        }
        // Get the fully hydrated state after auto-fill
        const finalState = await this.stateLoader.get(featurePath);
        if (!finalState) {
            throw new Error('Created feature state could not be loaded immediately after creation: ' + id);
        }
        // Return a FeatureWithFullHistory shape with expanded fields
        return {
            ...finalState,
            id,
            tasks: [] // Legacy field for backward compatibility
        };
    }
    async getState(featurePath) {
        const state = await this.stateLoader.get(featurePath);
        if (!state)
            return undefined;
        // Convert to FeatureWithFullHistory for backward compatibility
        return {
            ...state,
            id: state.feature, // Match the legacy field access for id
            name: state.name || state.feature, // Use name or feature as fallback
            tasks: [] // Legacy field for backward compatibility
        };
    }
    // Method to check if feature is a parent feature with children
    async isParentFeature(featurePath) {
        const state = await this.stateLoader.get(featurePath);
        if (state && state.version === 'v2.1.0' && state.childrens && Array.isArray(state.childrens)) {
            return state.childrens.length > 0;
        }
        // Also check with tree scanner if we don't have the childrens explicitly in state
        try {
            const treeStructure = await this.stateLoader.getTreeStructure();
            const node = treeStructure.flatMap.get(featurePath);
            if (node) {
                // We can also determine if it's a parent by checking tree structure
                return node.children.length > 0;
            }
        }
        catch (error) {
            console.warn(`Error checking tree structure for ${featurePath}: `, error.message);
        }
        return false;
    }
    async getAllFeatures() {
        // Load all distributed states using stateLoader
        const allStates = await this.stateLoader.loadAll();
        const features = [];
        for (const [featurePath, state] of allStates.entries()) {
            features.push({
                ...state,
                id: state.feature, // Map feature id for compat
                name: state.name || state.feature, // Use name or feature as fallback
                tasks: [] // Legacy compatibility field
            });
        }
        return features;
    }
    /**
     * 获取特定 feature 当前的相位 (SDD Phase: 1-6)
     */
    async getCurrentPhase(featurePath) {
        const feature = await this.getState(featurePath);
        if (!feature)
            return 0;
        return feature.phase || 0;
    }
    /**
     * 验证状态流转是否合法
     */
    async canTransition(featurePath, targetState) {
        const current = await this.getState(featurePath);
        if (!current) {
            return { valid: false, reason: 'Feature 不存在', current: undefined, target: targetState };
        }
        // Map the workflow status to our internal state enums
        // First, convert status field to a comparable state
        let currentState = 'drafting';
        if (current.status === 'specified')
            currentState = 'specified';
        else if (current.status === 'planned')
            currentState = 'planned';
        else if (current.status === 'tasked')
            currentState = 'tasked';
        else if (current.status === 'building')
            currentState = 'implementing';
        else if (current.status === 'reviewed')
            currentState = 'reviewed';
        else if (current.status === 'validated')
            currentState = 'validated';
        else
            currentState = 'drafting'; // default fallback
        const allowedTargets = this.validTransitions[currentState] || [];
        if (!allowedTargets.includes(targetState)) {
            return {
                valid: false,
                reason: `不允许从 ${currentState} 跳转到 ${targetState}`,
                current: currentState,
                target: targetState,
                allowed: allowedTargets
            };
        }
        return { valid: true, current: currentState, target: targetState };
    }
    /**
     * 获取缺失的前置阶段（用于显示跳过阶段的警告）
     */
    async getMissingStages(featurePath, targetState) {
        const current = await this.getState(featurePath);
        if (!current)
            return [];
        // Need to determine the current state based on status
        let currentState = 'drafting';
        if (current.status === 'specified')
            currentState = 'specified';
        else if (current.status === 'planned')
            currentState = 'planned';
        else if (current.status === 'tasked')
            currentState = 'tasked';
        else if (current.status === 'building')
            currentState = 'implementing';
        else if (current.status === 'reviewed')
            currentState = 'reviewed';
        else if (current.status === 'validated')
            currentState = 'validated';
        else
            currentState = 'drafting'; // default fallback
        const allStates = ['drafting', 'discovered', 'specified', 'planned', 'tasked', 'implementing', 'reviewed', 'validated', 'completed'];
        const currentIndex = allStates.indexOf(currentState);
        const targetIndex = allStates.indexOf(targetState);
        if (currentIndex === -1 || targetIndex === -1)
            return [];
        if (targetIndex <= currentIndex)
            return []; // 逆向或同阶段
        const stageNames = {
            'drafting': '草稿阶段 (discovery)',
            'discovered': '需求挖掘 (discovery)',
            'specified': '规范编写 (spec)',
            'planned': '技术规划 (plan)',
            'tasked': '任务分解 (tasks)',
            'implementing': '任务实现 (build)',
            'reviewed': '代码审查 (review)',
            'validated': '最终验证 (validate)',
            'completed': '完成'
        };
        const missing = [];
        for (let i = currentIndex + 1; i < targetIndex; i++) {
            const stateValue = allStates[i];
            if (stateValue) {
                // 如果是discovered并且我们要跳过它，将其加入警告列表
                if (stateValue === 'discovered') {
                    missing.push({ state: stateValue, name: stageNames[stateValue] });
                }
                else {
                    // 对于 SDDU 工作流阶段，标记可能的跳跃 - 根据 SDDU 阶段 1-6 进行考虑
                    missing.push({ state: stateValue, name: stageNames[stateValue] });
                }
            }
        }
        return missing;
    }
    /**
     * 检查必需文件是否存在 for parents vs leaves
     */
    async checkRequiredFiles(featurePath, targetState, isParent = false) {
        const required = this.requiredFiles[targetState];
        if (!required)
            return { valid: true, missing: [] }; // 若没有指定文件要求则认为有效
        if (isParent) {
            // For parent features, we only check discovery, spec, and plan - not implement/test/validate stages
            const parentRequired = required.filter(file => file.includes('discovery') ||
                file.includes('spec') ||
                file.includes('plan')); // Parents don't require implement/test/validate related files
            const missing = [];
            for (const file of parentRequired) {
                const filePath = path.join(featurePath, file);
                try {
                    await fs.access(filePath);
                }
                catch {
                    missing.push(file);
                }
            }
            return {
                valid: missing.length === 0,
                missing,
                present: parentRequired.filter(f => !missing.includes(f))
            };
        }
        const state = await this.load(featurePath);
        if (!state)
            return { valid: false, missing: required, reason: 'Feature 不存在' };
        const missing = [];
        for (const file of required) {
            const filePath = path.join(featurePath, file);
            try {
                await fs.access(filePath);
            }
            catch {
                if (file === 'discovery.md')
                    continue; // Make discovery optional in tree structure
                missing.push(file);
            }
        }
        return {
            valid: missing.length === 0,
            missing,
            present: required.filter(f => !missing.includes(f))
        };
    }
    /**
     * 完整的阶段跳转验证（核心方法 - 防跳过提醒关键）
     */
    async validateStageTransition(featurePath, targetState) {
        // Check if this is a parent state
        const isParent = await this.isParentFeature(featurePath);
        // 1. Check state existence and validity
        const current = await this.getState(featurePath);
        if (!current) {
            return {
                allowed: false,
                current: undefined,
                target: targetState,
                reason: 'Feature 路径不存在'
            };
        }
        // 2. 验证状态流转合法性
        const transitionCheck = await this.canTransition(featurePath, targetState);
        if (!transitionCheck.valid) {
            return {
                allowed: false,
                reason: transitionCheck.reason,
                current: transitionCheck.current,
                target: targetState,
                allowedTargets: transitionCheck.allowed,
                missingStages: await this.getMissingStages(featurePath, targetState)
            };
        }
        // 3. Check required files, taking into account parent/child differences  
        const fileCheck = await this.checkRequiredFiles(featurePath, targetState, isParent);
        if (!fileCheck.valid) {
            return {
                allowed: false,
                reason: '缺失必需文件',
                current: transitionCheck.current,
                target: targetState,
                missingFiles: fileCheck.missing,
                presentFiles: fileCheck.present
            };
        }
        const feature = current; // Using current as current feature
        if (feature && this.mapFeatureStateToInternal(current.status) === 'drafting' && targetState !== 'discovered') {
            const missingStages = await this.getMissingStages(featurePath, targetState);
            return {
                allowed: true, // 仍然允许通过，但返回警告
                current: transitionCheck.current,
                target: targetState,
                reason: '允许跳过阶段，建议先执行 @sddu discovery [feature] 进行需求挖掘',
                missingStages: missingStages
            };
        }
        // 5. 验证通过
        return {
            allowed: true,
            current: transitionCheck.current,
            target: targetState
        };
    }
    /**
     * Updates state (with validation) using distributed storage with hooks and history tracking
     */
    async updateState(featurePath, newState, data = {}, triggeredBy, comment, skipValidation = false, isParent = false) {
        const feature = await this.getState(featurePath);
        if (!feature) {
            throw new Error(`State does not exist at ${featurePath}`);
        }
        const originalStatus = feature.status; // Get old status
        const previousState = this.mapFeatureStateToInternal(originalStatus);
        // Only check verification in non-force update cases
        if (!skipValidation) {
            // Verify transition - will return whether rules permit it and possible warnings
            const validation = await this.validateStageTransition(featurePath, newState);
            // Note: For skipped discovered stage, issue warning but don't prevent for tree structure
            if (!validation.allowed && !validation.missingStages?.some(ms => ms.state === 'discovered')) {
                // Only throw error in cases where its not about discovered skip
                // But if it's a parent and going to advanced phases, reject
                if (isParent) {
                    const newStatePhase = this.getStatePhase(newState);
                    if (newStatePhase > 2) { // Don't let parents advance beyond planning phase  
                        throw new Error(`Parent features cannot advance beyond planning phase (${newStatePhase}), only leaf-features should proceed to implementation.`);
                    }
                }
                throw new Error(`State transition failed: ${validation.reason}`);
            }
            // Dependency state check (if dependency checker is configured)
            if (this.dependencyChecker) {
                const depCheck = await this.dependencyChecker.checkDependenciesForStateChange(featurePath, newState);
                if (!depCheck.allowed && depCheck.blockingFeatures && depCheck.blockingFeatures.length > 0) {
                    const blockingList = depCheck.blockingFeatures
                        .map(bf => `  - ${bf.featureId} (${bf.featureName}): ${bf.currentState} < ${bf.requiredState}`)
                        .join('\n');
                    throw new Error(`Dependency check failed, the following dependent Feature are not ready:\n${blockingList}`);
                }
            }
        }
        else {
            console.log(`Skipping validation for direct agent state update`);
        }
        // Execute pre-transition hook (if agent hook is registered)
        try {
            if (this.agentHook?.onTransitionStart) {
                this.agentHook.onTransitionStart(featurePath.split('/').pop() || featurePath, newState);
            }
        }
        catch (error) {
            console.warn('Warning: Agent hook onTransitionStart failed:', error);
            // Do not block main operation
        }
        // Create new state object based on existing state
        const now = new Date().toISOString();
        const updatedPhase = this.getStatePhase(newState);
        const workflowStatusFromNewState = this.mapInternalStateToWorkflowStatus(newState);
        // Prepare updated state following the StateV2_1_0 schema
        const updatedState = {
            ...feature,
            status: workflowStatusFromNewState,
            phase: updatedPhase,
            phaseHistory: [
                ...(feature.phaseHistory || []),
                {
                    phase: updatedPhase,
                    status: workflowStatusFromNewState,
                    timestamp: now,
                    triggeredBy: triggeredBy || 'system',
                    comment: comment
                }
            ],
            dependencies: {
                on: (feature.dependencies && feature.dependencies.on) || [],
                blocking: (feature.dependencies && feature.dependencies.blocking) || []
            },
            files: {
                spec: (feature.files && feature.files.spec) || '',
                plan: (feature.files && feature.files.plan) || undefined,
                tasks: (feature.files && feature.files.tasks) || undefined,
                readme: (feature.files && feature.files.readme) || undefined,
                review: (feature.files && feature.files.review) || undefined,
                validation: (feature.files && feature.files.validation) || undefined
            }
        };
        // Add history entry
        const updatedHistory = [
            ...(feature.history || []),
            {
                timestamp: now,
                from: previousState,
                to: newState,
                triggeredBy: triggeredBy || 'system',
                comment: comment
            }
        ];
        updatedState.history = updatedHistory;
        // Validate the state before saving
        if (!validateStateV2_1_0(updatedState)) {
            throw new Error(`New state for ${featurePath} failed validation against v2.1.0 schema`);
        }
        // Save using StateLoader (distributed state save)
        const success = await this.stateLoader.set(featurePath, updatedState);
        if (!success) {
            throw new Error(`Failed to save state to ${featurePath}`);
        }
        // Execute post-transition hook (if agent hook is registered)
        try {
            if (this.agentHook?.onTransitionComplete) {
                this.agentHook.onTransitionComplete(featurePath.split('/').pop() || featurePath, previousState, newState, triggeredBy, comment);
            }
        }
        catch (error) {
            console.warn('Warning: Agent hook onTransitionComplete failed:', error);
            if (this.agentHook?.onError) {
                this.agentHook.onError(error, featurePath, newState.toString());
            }
            // Do not block main operation
        }
        // Convert and return in expected format for compatibility
        return {
            ...updatedState,
            id: updatedState.feature,
            name: updatedState.name || updatedState.feature,
            tasks: [...(feature.tasks || [])]
        };
    }
    // Helper method to determine phase number based on internal state
    getStatePhase(internState) {
        switch (internState) {
            case 'drafting':
            case 'discovered':
            case 'specified': return 1; // Spec phase
            case 'planned': return 2; // Plan phase
            case 'tasked': return 3; // Tasks phase
            case 'implementing': return 4; // Build phase
            case 'reviewed': return 5; // Review phase
            case 'validated':
            case 'completed': return 6; // Validate phase
            default: return 1;
        }
    }
    // Map internal state to workflow status as defined in schema v2.0.0
    mapInternalStateToWorkflowStatus(state) {
        switch (state) {
            case 'specified': return 'specified';
            case 'planned': return 'planned';
            case 'tasked': return 'tasked';
            case 'implementing': return 'building'; // implementing maps to 'building'
            case 'reviewed': return 'reviewed';
            case 'validated': return 'validated';
            default:
                // For other states like 'drafting', 'discovered', 'completed', return 'specified' as a default
                if (state === 'completed')
                    return 'validated';
                return 'specified';
        }
    }
    // Map internal workflow status back internal state
    mapFeatureStateToInternal(workflowStatus) {
        switch (workflowStatus) {
            case 'specified': return 'specified';
            case 'planned': return 'planned';
            case 'tasked': return 'tasked';
            case 'building': return 'implementing';
            case 'reviewed': return 'reviewed';
            case 'validated': return 'validated';
            default: return 'drafting';
        }
    }
    /**
     * 获取下一步建议
     */
    async getNextStep(featurePath) {
        const feature = await this.getState(featurePath);
        if (!feature)
            return null;
        const stateStatus = feature.status;
        const stateValue = this.mapFeatureStateToInternal(stateStatus);
        const allowed = this.validTransitions[stateValue] || [];
        if (allowed.length === 0) {
            return { state: 'completed', action: '已完成，无需操作' };
        }
        const nextState = allowed[0];
        const actionMap = {
            'drafting': '推荐执行 @sddu discovery [feature] 进行需求挖掘，或者直接 @sddu spec [feature] 定义规范',
            'discovered': '@sddu spec [feature]', // 从discovered阶段建议下一步spec
            'specified': '@sddu plan [feature]',
            'planned': '@sddu tasks [feature]',
            'tasked': '@sddu build [TASK-XXX]',
            'implementing': '@sddu review [feature]',
            'reviewed': '@sddu validate [feature]',
            'validated': '完成',
            'completed': '完成'
        };
        return { state: nextState, action: actionMap[nextState] || '未知' };
    }
}
