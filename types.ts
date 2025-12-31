export interface Thought {
  id: string;
  content: string;
  tags: string[];
  createdAt: number;
}

export enum NicheType {
  BEAUTY = '美妆博主',
  FOOD = '美食博主',
  FASHION = '时尚博主',
  TRAVEL = '旅行博主',
  READING = '读书博主',
  GROWTH = '个人成长博主',
  RELATIONSHIPS = '两性恋爱博主',
  OTHER = '其他'
}

export enum PlatformType {
  XIAOHONGSHU = '小红书',
  WECHAT_MOMENTS = '朋友圈',
  DOUYIN = '抖音',
  TIKTOK = 'TikTok',
  INSTAGRAM = 'Instagram',
  X = 'X (Twitter)'
}

export interface GlobalSettings {
  niche: NicheType;
  styleDescription: string;
  customApiKey?: string;
  aiProvider?: 'gemini' | 'deepseek' | 'qwen';
}

export interface GenerationConfig extends GlobalSettings {
  platform: PlatformType;
  refUrl: string;
  selectedThoughtIds: string[];
  styleMode: 'manual' | 'auto';
  withImage: boolean;
}

export interface AuditScore {
  headline: number;
  quality: number;
  emotion: number;
  trending: number;
  viralPotential: number;
  overall: number;
  suggestions: string[];
  pros: string[]; 
  sensitiveWords: string[];
}

export interface GeneratedCopy {
  id: string;
  config: GenerationConfig;
  content: string; 
  audit: AuditScore;
  imageUrl?: string;
  createdAt: number;
}