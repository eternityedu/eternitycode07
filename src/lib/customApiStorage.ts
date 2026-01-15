// Custom API Key storage for user-provided AI APIs
// Stored in localStorage for privacy

export interface CustomApiConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  baseUrl?: string;
  modelId?: string;
  enabled: boolean;
}

// Custom API model to show in model selector
export interface CustomApiModel {
  id: string;
  name: string;
  provider: CustomApiConfig['provider'];
}

const STORAGE_KEY = 'eternity-custom-api';

export function getCustomApiConfig(): CustomApiConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse custom API config:', e);
  }
  return null;
}

export function setCustomApiConfig(config: CustomApiConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearCustomApiConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isCustomApiEnabled(): boolean {
  const config = getCustomApiConfig();
  return config?.enabled === true && !!config.apiKey;
}

// Get the custom API model for the model selector
export function getCustomApiModel(): CustomApiModel | null {
  const config = getCustomApiConfig();
  if (!config?.enabled || !config.apiKey) return null;
  
  const providerNames: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google AI',
    custom: 'Custom',
  };
  
  const modelName = config.modelId || getDefaultModelForProvider(config.provider);
  
  return {
    id: `custom:${config.provider}`,
    name: config.modelId || `${providerNames[config.provider]} (Custom)`,
    provider: config.provider,
  };
}

// Get default model based on provider
export function getDefaultModelForProvider(provider: string): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o';
    case 'anthropic':
      return 'claude-3-5-sonnet-20241022';
    case 'google':
      return 'gemini-2.0-flash';
    default:
      return 'custom-model';
  }
}

// Get API endpoint based on provider
export function getApiEndpoint(config: CustomApiConfig): string {
  if (config.baseUrl) {
    return config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
  }
  
  switch (config.provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com/v1';
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta';
    default:
      return config.baseUrl || '';
  }
}
