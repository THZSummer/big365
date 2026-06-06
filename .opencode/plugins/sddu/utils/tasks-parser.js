/**
 * 任务解析器 - 解析tasks.md的内容并计算执行顺序
 */
// 解析并行分组
export function parseParallelGroups(content) {
    const groups = [];
    const groupHeaderRegex = /###\s*组\s*(\d+):\s*([^\n\r]+)(?:$|[\n\r])/gm;
    const lines = content.split(/\r?\n/);
    const groupPositions = [];
    let match;
    while ((match = groupHeaderRegex.exec(content)) !== null) {
        // 正确提取分组名称，包括处理"等待组X"这样的后缀
        const groupId = parseInt(match[1], 10);
        const fullGroupName = match[2].trim();
        // 提取出实际组名部分（不含等待组的说明）
        const actualGroupName = fullGroupName.replace(/\s*\(.*等待组\s*\d+.*\)|等待组\s*\d+/g, '').trim();
        groupPositions.push({
            index: match.index,
            id: groupId,
            name: actualGroupName
        });
    }
    // 如果没有找到任何组，则认为整个内容是一个组（ID 为 0）
    if (groupPositions.length === 0) {
        const allTasks = parseTasksFromLines(lines);
        groups.push({
            id: 0,
            name: '默认组',
            tasks: allTasks,
            waitGroups: []
        });
    }
    else {
        // 根据组头位置切分内容
        for (let i = 0; i < groupPositions.length; i++) {
            let startIndex = groupPositions[i].index;
            let endIndex = i === groupPositions.length - 1 ? content.length : groupPositions[i + 1].index;
            // 找到组开始的实际行
            let startLine = 0;
            let pos = 0;
            while (startLine < lines.length && pos < startIndex) {
                pos += lines[startLine].length + 1; // +1 for the newline
                startLine++;
            }
            // 检查标题所在行，找到实际内容开始之处（即标题后的一行）
            let contentStartLine = startLine + 1;
            while (contentStartLine < lines.length && lines[contentStartLine].trim() === '') {
                contentStartLine++; // 跳过空行
            }
            // 找到结束位置的行
            let endLine = contentStartLine;
            while (endLine < lines.length && pos < endIndex) {
                pos += lines[endLine].length + 1; // +1 for the newline
                endLine++;
            }
            // 在原始内容中找到对应的组头部以解析依赖
            const originalGroupHeading = content.substring(startIndex, content.indexOf('\n', startIndex)).trim();
            // 从组标题中提取等待组信息
            const waitGroupMatches = originalGroupHeading.match(/等待组\s+(\d+)/);
            let waitGroupIds = undefined;
            if (waitGroupMatches) {
                const waitGroupId = parseInt(waitGroupMatches[1], 10);
                waitGroupIds = [waitGroupId];
            }
            const groupContent = lines.slice(contentStartLine, endLine).join('\n');
            const groupTasks = parseTasksFromGroupContent(groupContent);
            groups.push({
                id: groupPositions[i].id,
                name: groupPositions[i].name,
                tasks: groupTasks,
                waitGroups: waitGroupIds
            });
        }
    }
    return groups;
}
// 解析 tasks.md 内容
export function parseTasksMarkdown(content) {
    const groups = [];
    // 解析并行组
    const groupsResult = parseParallelGroups(content);
    // 收集所有的任务（去重，因为我们不要重复添加相同ID的任务）
    const tasksMap = new Map();
    for (const group of groupsResult) {
        for (const task of group.tasks) {
            task.group = group.id;
            tasksMap.set(task.id, task);
        }
    }
    return {
        groups: groupsResult,
        tasks: Array.from(tasksMap.values())
    };
}
// 解析单个组内的任务内容
function parseTasksFromGroupContent(groupContent) {
    const lines = groupContent.split(/\r?\n/);
    return parseTasksFromLines(lines);
}
// 解析行数组中的任务
function parseTasksFromLines(lines) {
    const tasks = [];
    const taskRegex = /^[-*]\s*\[.\]\s*(\w+-?\d+-?\w*):\s*(.*?)\s*\(?(\d+)\s*小时?\)?$/;
    const simpleTaskRegex = /^[-*]\s*\[.\]\s*(\w+-?\d+-?\w*):\s*(.*?)$/;
    const generalTaskRegex = /^[-*]\s*\[.\]\s*(.+)$/;
    for (const line of lines) {
        let match = line.match(taskRegex); // 完整格式，带工时
        if (match) {
            const taskId = match[1];
            const description = match[2].trim();
            const hours = parseInt(match[3], 10);
            const dependencies = extractTaskDependencies(description);
            tasks.push({
                id: taskId.trim(),
                description: description,
                dependencies,
                estimatedHours: hours
            });
        }
        else {
            match = line.match(simpleTaskRegex); // 简单格式
            if (match) {
                const taskId = match[1];
                const description = match[2].trim();
                const dependencies = extractTaskDependencies(description);
                tasks.push({
                    id: taskId.trim(),
                    description: description,
                    dependencies
                });
            }
            else {
                // 检查是否为通用格式的任务（纯描述文本，但仍然包含 TASK-XXX）
                match = line.match(generalTaskRegex);
                if (match) {
                    const taskText = match[1].trim();
                    // 尝试从中提取 TASK-XXX 格式的 ID 和描述
                    const taskPartMatch = taskText.match(/^(\w+-?\d+-?\w*):\s*(.*?)$/);
                    if (taskPartMatch) {
                        const taskId = taskPartMatch[1];
                        const description = taskPartMatch[2]?.trim() || taskText;
                        const dependencies = extractTaskDependencies(description);
                        tasks.push({
                            id: taskId.trim(),
                            description: description,
                            dependencies
                        });
                    }
                    else if (taskText.includes(':') && taskText.match(/\bTASK-\d+/i)) {
                        // 更宽泛地查找任务格式
                        const colonSplit = taskText.split(':');
                        const idPart = colonSplit[0].trim();
                        if (idPart.match(/^\w+-?\d+-?\w*$/)) { // 检查是否是任务ID格式
                            const description = colonSplit.slice(1).join(':').trim();
                            const dependencies = extractTaskDependencies(description);
                            tasks.push({
                                id: idPart,
                                description: description,
                                dependencies
                            });
                        }
                    }
                }
            }
        }
    }
    // 过滤掉空ID的任务
    return tasks.filter(task => task.id && task.id.trim().length > 0);
}
// 从描述中提取任务依赖
function extractTaskDependencies(description) {
    const matches = [];
    // 匹配多种依赖格式:
    // - "依赖TASK-001"
    // - "依赖 TASK-001"
    // - "依赖: TASK-001"
    // - "依赖于: TASK-001"
    // - "依赖于TASK-001"
    // - "TASK-001, TASK-002" 等
    const regex = /\b(?:依赖(?:于)?[：:]?\s*([^\n\r,.;!?\s]+)|依赖\s+([^\n\r,.;!?\s]+))\b/gi;
    let match;
    while ((match = regex.exec(description)) !== null) {
        // 从匹配结果中提取任务ID
        const captureGroup = match[1] || match[2];
        if (captureGroup) {
            // 分割可能的多个任务ID（用逗号或and分隔）
            const potentialIDs = captureGroup.replace(/\s+/g, ' ').trim().split(/[,，\s+]\s*/);
            for (const potentialId of potentialIDs) {
                // 确保它是TASK-XXX 格式的ID
                if (/^TASK-\d+(-\d+)?$/i.test(potentialId.trim())) {
                    matches.push(potentialId.trim());
                }
            }
        }
    }
    // 作为额外检查，也直接搜索TASK-XXX模式
    const taskPattern = /TASK-\d+(-\d+)?/gi;
    let taskMatch;
    while ((taskMatch = taskPattern.exec(description)) !== null) {
        const taskId = taskMatch[0];
        if (!matches.includes(taskId)) {
            matches.push(taskId);
        }
    }
    return [...new Set(matches)]; // 返回去重后的依赖任务ID列表
}
// 从字符串解析单个任务
export function parseTask(line, groupId) {
    // 尽力解析一行任务定义
    const taskMatch = line.match(/^[-*]\s*\[.\]\s*(\w+-?\d+-?\w*):\s*(.*)$/);
    if (taskMatch) {
        const id = taskMatch[1].trim();
        const description = taskMatch[2].trim();
        const dependencies = extractTaskDependencies(description);
        return {
            id,
            description,
            dependencies,
            ...(groupId !== undefined ? { group: groupId } : {})
        };
    }
    return null;
}
// 计算任务执行顺序（波次）
export function computeExecutionOrder(groups) {
    if (!groups || groups.length === 0) {
        return [];
    }
    // 创建组依赖关系
    const groupGraph = {};
    for (const group of groups) {
        groupGraph[group.id] = group.waitGroups || [];
    }
    // 执行拓扑排序来确定波次
    const waves = [];
    const availableGroups = new Set(groups.map(g => g.id));
    const processedGroups = new Set();
    let waveCounter = 0;
    while (availableGroups.size > 0) {
        const readyGroups = [];
        // 找出所有依赖都满足的组
        for (const groupId of availableGroups) {
            const group = groups.find(g => g.id === groupId);
            const deps = groupGraph[group.id] || [];
            // 检查是否所有依赖都已经处理了
            let allDepsSatisfied = true;
            for (const depGroupId of deps) {
                if (!processedGroups.has(depGroupId)) {
                    allDepsSatisfied = false;
                    break;
                }
            }
            if (allDepsSatisfied) {
                readyGroups.push(group);
            }
        }
        // 检测循环依赖
        if (readyGroups.length === 0) {
            // 没有可用组，可能存在循环依赖或者依赖错误
            throw new Error(`检测到组依赖循环或无效依赖：未处理组 ${Array.from(availableGroups).join(', ')}`);
        }
        // 将这些组加入当前波次
        const tasksInWave = [];
        for (const group of readyGroups) {
            processedGroups.add(group.id);
            availableGroups.delete(group.id);
            group.tasks.forEach(task => {
                tasksInWave.push(task);
            });
        }
        waves.push({
            waveNumber: waveCounter++,
            groups: readyGroups,
            tasks: tasksInWave
        });
    }
    return waves;
}
// 检测循环依赖 - 适用于任务级别
export function detectTaskCircularDependency(tasks) {
    const graph = {};
    // 构建依赖图
    for (const task of tasks) {
        graph[task.id] = task.dependencies;
    }
    const visiting = new Set();
    const visited = new Set();
    function dfs(taskId, path) {
        if (visiting.has(taskId)) {
            // 找到循环：从路径中taskId第一次出现的地方开始
            const start = path.indexOf(taskId);
            return path.slice(start).concat(taskId);
        }
        if (visited.has(taskId)) {
            return null;
        }
        visiting.add(taskId);
        path.push(taskId);
        for (const dep of graph[taskId] || []) {
            const cycle = dfs(dep, [...path]);
            if (cycle) {
                return cycle;
            }
        }
        visiting.delete(taskId);
        visited.add(taskId);
        return null;
    }
    for (const task of tasks) {
        const cycle = dfs(task.id, []);
        if (cycle) {
            return cycle;
        }
    }
    return null;
}
// 获取可执行的任务列表
export function getReadyTasks(tasks, completedTasks) {
    return tasks.filter(task => {
        // 检查所有依赖是否已完成
        return task.dependencies.every(dep => completedTasks.has(dep));
    }).filter(task => !completedTasks.has(task.id)); // 还没完成的任务
}
// 辅助函数：获取未完成的任务
export function getIncompleteTasks(tasks, completedTasks) {
    return tasks.filter(task => !completedTasks.has(task.id));
}
// 辅助函数：验证是否所有依赖都已满足
export function areDependenciesSatisfied(task, completedTasks) {
    return task.dependencies.every(dep => completedTasks.has(dep));
}
