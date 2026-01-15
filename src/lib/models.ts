// Available AI models for Eternity Code
import { getCustomApiModel, isCustomApiEnabled } from './customApiStorage';

export interface AIModel {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'anthropic' | 'custom';
  description: string;
  speed: 'fast' | 'balanced' | 'slow';
  quality: 'standard' | 'high' | 'premium';
  isCustom?: boolean;
}

export const BUILT_IN_MODELS: AIModel[] = [
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'google',
    description: 'Fast & efficient for most tasks',
    speed: 'fast',
    quality: 'high',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Balanced speed and reasoning',
    speed: 'balanced',
    quality: 'high',
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    description: 'Best for complex code generation',
    speed: 'slow',
    quality: 'premium',
  },
  {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    provider: 'google',
    description: 'Next-gen complex reasoning',
    speed: 'slow',
    quality: 'premium',
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    description: 'OpenAI balanced performance',
    speed: 'balanced',
    quality: 'high',
  },
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    description: 'OpenAI premium reasoning',
    speed: 'slow',
    quality: 'premium',
  },
];

// Get all available models including custom API if enabled
export function getAvailableModels(): AIModel[] {
  const models = [...BUILT_IN_MODELS];
  
  const customModel = getCustomApiModel();
  if (customModel) {
    // Add custom model at the top
    models.unshift({
      id: customModel.id,
      name: `⚡ ${customModel.name}`,
      provider: customModel.provider as AIModel['provider'],
      description: 'Your custom API',
      speed: 'balanced',
      quality: 'premium',
      isCustom: true,
    });
  }
  
  return models;
}

export const AI_MODELS = BUILT_IN_MODELS; // For backwards compatibility

export const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

export function getModelById(id: string): AIModel | undefined {
  return getAvailableModels().find(m => m.id === id);
}

// Check if a model ID is a custom API model
export function isCustomModel(modelId: string): boolean {
  return modelId.startsWith('custom:');
}
