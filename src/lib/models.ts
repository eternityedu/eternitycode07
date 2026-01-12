// Available AI models for Eternity Code
export interface AIModel {
  id: string;
  name: string;
  provider: 'google' | 'openai';
  description: string;
  speed: 'fast' | 'balanced' | 'slow';
  quality: 'standard' | 'high' | 'premium';
}

export const AI_MODELS: AIModel[] = [
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

export const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find(m => m.id === id);
}
