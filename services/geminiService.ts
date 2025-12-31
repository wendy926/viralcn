import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig, AuditScore, PlatformType, NicheType, Thought, GlobalSettings } from "../types";

// Helper for Gemini
const getGeminiClient = (customKey?: string) => {
  const key = customKey || process.env.API_KEY || '';
  return new GoogleGenAI({ apiKey: key });
};

// Helper for OpenAI Compatible APIs (DeepSeek, Qwen, etc.)
const callOpenAICompatible = async (
  baseURL: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> => {
  try {
    const response = await fetch(baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false
      })
    });
    
    if (!response.ok) {
       const err = await response.text();
       console.error("API Call failed:", err);
       throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("External API call failed", error);
    throw error;
  }
};

// Unified Text Generation Function
const generateText = async (
  systemPrompt: string,
  userPrompt: string,
  config?: { customApiKey?: string, aiProvider?: string, thinkingBudget?: number }
): Promise<string> => {
  const provider = config?.aiProvider || 'gemini';
  const apiKey = config?.customApiKey || process.env.API_KEY || '';

  if (provider === 'deepseek') {
    // Using DeepSeek API
    return callOpenAICompatible(
      'https://api.deepseek.com/chat/completions',
      'deepseek-chat',
      apiKey,
      systemPrompt,
      userPrompt
    );
  } else if (provider === 'qwen') {
    // Using Alibaba DashScope (OpenAI Compatible Endpoint)
    return callOpenAICompatible(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      'qwen-plus',
      apiKey,
      systemPrompt,
      userPrompt
    );
  } else {
    // Default to Gemini
    const ai = getGeminiClient(apiKey);
    const thinkingConfig = config?.thinkingBudget ? { thinkingConfig: { thinkingBudget: config.thinkingBudget } } : undefined;
    
    // Combining system and user prompt for generateContent as systemInstruction is separate in config
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Default to flash for general tasks, can be overridden if needed
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        ...thinkingConfig
      }
    });
    return response.text || "";
  }
};

// Helper to get model based on task complexity (Gemini only)
const getGeminiTextModel = () => 'gemini-3-pro-preview'; 
const getGeminiImageModel = () => 'gemini-2.5-flash-image';

export const analyzeStyleFromText = async (exampleText: string, apiKey?: string): Promise<string> => {
  try {
     const ai = getGeminiClient(apiKey);
     const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `分析以下文本的写作风格、语气和格式。提供一个简明扼要的中文描述（最多一句话），描述这个人设风格。例如：“理性叙述中融入强烈情感表达”或“幽默风趣的口语化表达”。文本内容: "${exampleText.substring(0, 1000)}"`
    });
    return response.text || "专业且客观的风格";
  } catch (e) {
     return "通用专业风格";
  }
};

export const generateTagsForThought = async (
  thoughtContent: string, 
  apiKey?: string,
  provider?: string
): Promise<string[]> => {
  const systemPrompt = "你是一个助手，负责根据用户输入的文本内容，生成1-3个简短的标签（Tag）。";
  const userPrompt = `请分析以下内容，生成最贴切的1-3个标签（例如：生活、感悟、工作、灵感等）。
  
  内容: "${thoughtContent.substring(0, 500)}"
  
  要求:
  1. 仅返回标签，用逗号分隔。
  2. 不要包含任何其他解释文字。
  `;

  try {
    const result = await generateText(systemPrompt, userPrompt, { customApiKey: apiKey, aiProvider: provider });
    // Cleanup result
    const tags = result.replace(/，/g, ',').split(',').map(t => t.trim()).filter(t => t.length > 0);
    return tags.slice(0, 3); // Limit to 3
  } catch (error) {
    console.error("Tag generation error", error);
    return ["通用"];
  }
};

export const smartOrganizeThoughts = async (thoughts: Thought[], apiKey?: string): Promise<string> => {
  const ai = getGeminiClient(apiKey);
  if (thoughts.length === 0) return "暂无碎片想法";

  const allContent = thoughts.map(t => `- ${t.content}`).join('\n');

  const prompt = `
    角色: 资深内容助理。
    任务: 分析用户提供的所有碎片化想法，识别其中最相关、最具连贯性的主题内容，将它们整合成一段通顺的初步文案草稿。
    
    碎片想法列表:
    ${allContent}
    
    要求:
    1. 识别出共同主题或关联性强的想法。
    2. 剔除明显无关或重复的内容。
    3. 语言通顺，逻辑连贯，作为一篇文案的基础素材。
    4. 仅仅返回整理后的文本，不要包含解释。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || "";
  } catch (error) {
    console.error("Smart organize failed", error);
    throw error;
  }
};

export const extractContentFromUrl = async (url: string): Promise<string> => {
  if (!url) return "";
  try {
    // Using jina.ai reader as a proxy to get markdown content
    const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`);
    if (response.ok) {
        return await response.text();
    }
  } catch (e) {
    console.error("Extraction failed", e);
  }
  return "";
};

export const generateViralCopy = async (
  config: GenerationConfig,
  thoughts: Thought[],
  baseContent?: string
): Promise<string> => {
  
  // Prepare content
  let contentSource = "";
  if (baseContent && baseContent.trim()) {
    contentSource = `基础草稿内容 (请基于此内容进行优化和格式化):\n${baseContent}`;
  } else {
    const thoughtContent = thoughts
      .filter(t => config.selectedThoughtIds.includes(t.id))
      .map(t => `- ${t.content} (标签: ${t.tags.join(', ')})`)
      .join('\n');
    contentSource = `用户碎片想法:\n${thoughtContent}`;
  }

  // Determine language based on platform
  const isEnglishPlatform = [
    PlatformType.TIKTOK, 
    PlatformType.INSTAGRAM, 
    PlatformType.X
  ].includes(config.platform);

  const targetLanguage = isEnglishPlatform ? "English" : "简体中文 (Simplified Chinese)";

  // Format description
  let formatDesc = "";
  switch (config.platform) {
    case PlatformType.XIAOHONGSHU:
      formatDesc = "小红书风格：标题吸引人（含emoji），正文分段清晰，多用emoji，文末加相关话题标签。";
      break;
    case PlatformType.WECHAT_MOMENTS:
      formatDesc = "朋友圈风格：生活感强，真诚自然，文字精炼，像在和朋友分享，不要过于营销化，不要标题党。";
      break;
    case PlatformType.DOUYIN:
      formatDesc = "抖音风格：适合口播的短句，节奏感强，黄金三秒原则，引导互动。";
      break;
    case PlatformType.TIKTOK:
      formatDesc = "TikTok style: Engaging hook, short sentences, trending hashtags, casual tone.";
      break;
    case PlatformType.INSTAGRAM:
      formatDesc = "Instagram style: Aesthetic caption, spacing for readability, relevant hashtags, engaging question.";
      break;
    case PlatformType.X:
      formatDesc = "X (Twitter) style: Concise, witty, thread-friendly if long, impactful statements.";
      break;
    default:
      formatDesc = `深度适配${config.platform}的阅读习惯。`;
  }

  const systemPrompt = "角色: 你是一位精通社交媒体的爆款文案专家。";
  const userPrompt = `
    任务: 根据提供的内容素材，创作一篇容易产生爆款潜质的社交媒体文案。
    
    上下文信息:
    - 目标平台: ${config.platform}
    - 账号定位: ${config.niche}
    - 内容来源:
    ${contentSource}
    ${config.refUrl ? `- 参考链接/内容: ${config.refUrl}` : ''}
    - 期望风格: ${config.styleDescription}
    
    要求:
    1. 语言: ${targetLanguage}.
    2. 格式: ${formatDesc}
    3. 字数: 800字以内。
    4. 结构: 必须包含 吸引人的标题 (Headline) 和 正文 (Body) (朋友圈除外，朋友圈通常无明确标题，但第一句要吸引人)。
    5. 语气: 必须严格贴合"${config.styleDescription}"的风格描述。
    
    输出: 仅输出文案内容，不要包含任何markdown代码块标记。
  `;

  // Use the unified generator
  if (config.aiProvider === 'gemini' || !config.aiProvider) {
      const ai = getGeminiClient(config.customApiKey);
      const response = await ai.models.generateContent({
        model: getGeminiTextModel(),
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          thinkingConfig: { thinkingBudget: 1024 } 
        }
      });
      return response.text || "";
  } else {
      // For DeepSeek/Qwen
      return generateText(systemPrompt, userPrompt, { 
        customApiKey: config.customApiKey, 
        aiProvider: config.aiProvider 
      });
  }
};

export const auditCopyContent = async (content: string, platform: PlatformType, apiKey?: string): Promise<AuditScore> => {
  const ai = getGeminiClient(apiKey);

  const prompt = `
    作为资深内容运营，请分析以下${platform}文案。
    返回一个JSON对象，包含各项评分（0-100分），文案优点，优化建议，以及潜在敏感词。
    
    文案内容:
    ${content}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.NUMBER, description: "标题吸引力评分 0-100" },
            quality: { type: Type.NUMBER, description: "内容质量评分 0-100" },
            emotion: { type: Type.NUMBER, description: "情感共鸣评分 0-100" },
            trending: { type: Type.NUMBER, description: "话题热度评分 0-100" },
            viralPotential: { type: Type.NUMBER, description: "爆款潜力评分 0-100" },
            overall: { type: Type.NUMBER, description: "综合评分 0-100" },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3条具体的优化建议" },
            pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3条文案优点" },
            sensitiveWords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "潜在敏感词/违禁词" }
          },
          required: ["headline", "quality", "emotion", "trending", "viralPotential", "overall", "suggestions", "pros", "sensitiveWords"]
        }
      }
    });
    
    const result = JSON.parse(response.text || "{}");
    return result as AuditScore;
  } catch (error) {
    console.error("Audit failed", error);
    return {
      headline: 0, quality: 0, emotion: 0, trending: 0, viralPotential: 0, overall: 0,
      suggestions: ["分析失败"], pros: [], sensitiveWords: []
    };
  }
};

export const generateImageForCopy = async (copyText: string, niche: NicheType, apiKey?: string): Promise<string> => {
  const ai = getGeminiClient(apiKey);

  const promptGenResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this social media post, create a high-quality English image generation prompt for a lifestyle cover image suitable for ${niche}. Post content: "${copyText.substring(0, 300)}..."`
  });
  
  const imagePrompt = promptGenResponse.text || `A high quality aesthetic photo for ${niche}`;

  try {
    const response = await ai.models.generateContent({
      model: getGeminiImageModel(),
      contents: {
        parts: [{ text: imagePrompt }]
      },
      config: {
        imageConfig: {
            aspectRatio: "3:4", 
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found");
  } catch (error) {
    console.error("Image generation failed", error);
    throw error;
  }
};