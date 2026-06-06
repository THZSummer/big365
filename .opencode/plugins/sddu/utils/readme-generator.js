/**
 * 生成 Feature 级 README
 * @param template README 模板数据
 * @returns Markdown 格式的 README 内容
 */
export function generateFeatureReadme(template) {
    const { featureName, description = '', subFeatures = [] } = template;
    let content = `# Feature: ${featureName}\n\n`;
    if (description) {
        content += `${description}\n\n`;
    }
    content += `快速导航：\n`;
    content += `- 📋 [Spec](spec.md) - 需求规格\n`;
    content += `- 🏗️ [Plan](plan.md) - 技术规划\n`;
    content += `- 📝 [Tasks](tasks.md) - 任务分解\n`;
    if (subFeatures.length > 0) {
        content += `\n## 子 Feature 列表\n\n`;
        content += `| 子 Feature | 状态 | 负责人 |\n`;
        content += `|------------|------|--------|\n`;
        subFeatures.forEach(sf => {
            const assignee = sf.assignee ? sf.assignee : '-';
            content += `| [${sf.name}](${sf.dir}/) | ${sf.status} | ${assignee} |\n`;
        });
        content += `\n## 快速开始\n`;
        content += `1. 阅读 [spec.md](spec.md) 了解整体需求\n`;
        content += `2. 选择负责的子 Feature 进入对应目录\n`;
        content += `3. 查看子 Feature 的 README.md 了解详细范围\n`;
    }
    return content;
}
/**
 * 生成子 Feature 级 README
 * @param info 子 Feature 信息
 * @returns Markdown 格式的 README 内容
 */
export function generateSubFeatureReadme(info) {
    const { name, description = '', status = 'Not Started', assignee = '', scope = { included: [], excluded: [] }, dependencies = { upstream: [], downstream: [] }, interfaces = '' } = info;
    let content = `# ${name}\n\n`;
    if (description) {
        content += `## 概述\n${description}\n\n`;
    }
    // 范围部分
    content += `## 范围\n`;
    if (scope.included.length > 0) {
        content += `### 包含\n`;
        scope.included.forEach(item => {
            content += `- ${item}\n`;
        });
        content += `\n`;
    }
    if (scope.excluded.length > 0) {
        content += `### 不包含\n`;
        scope.excluded.forEach(item => {
            content += `- ${item}\n`;
        });
        content += `\n`;
    }
    // 依赖部分
    content += `## 依赖\n`;
    if (dependencies.upstream.length > 0) {
        content += `- 上游：${dependencies.upstream.join(', ')}\n`;
    }
    else {
        content += `- 上游：-\n`;
    }
    if (dependencies.downstream.length > 0) {
        content += `- 下游：${dependencies.downstream.join(', ')}\n`;
    }
    else {
        content += `- 下游：-\n`;
    }
    // 接口部分
    if (interfaces) {
        content += `\n## 接口约定\n${interfaces}\n\n`;
    }
    // 状态部分
    content += `\n## 状态\n`;
    content += `- 当前状态：${status}\n`;
    content += `- 负责人：${assignee || '-'}\n`;
    return content;
}
