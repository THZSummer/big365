/**
 * 辅导模式引擎
 * 根据用户输入的详细程度和关键词自动判断用户所处的阶段，
 * 并提供相应的引导策略
 */
import { CoachingLevel, CoachingConfig, DiscoveryContext } from './types';
export declare const COACHING_CONFIGS: Record<CoachingLevel, CoachingConfig>;
export { CoachingLevel };
export declare class CoachingModeEngine {
    /**
     * 检测用户的辅导级别
     * @param userInput 用户输入的原始需求，可为空字符串表示用户希望指定级别
     * @param desiredLevel 用户手动指定的等级
     * @returns CoachingLevel
     */
    detectLevel(userInput?: string, desiredLevel?: CoachingLevel): CoachingLevel;
    /**
     * 扫描输入文本中的关键词
     */
    private scanKeywords;
    /**
     * 获取辅导级别的引导策略
     */
    getGuidanceStrategy(level: CoachingLevel): CoachingConfig;
    /**
     * 应用辅导策略到发现上下文中
     */
    applyCoachingStrategy(context: DiscoveryContext, level: CoachingLevel): DiscoveryContext;
    /**
     * 根据用户的辅导级别调整提示词详细程度
     */
    adjustPromptsByLevel(prompts: string[], level: CoachingLevel): string[];
}
