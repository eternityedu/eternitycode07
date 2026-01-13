// Custom API Key storage for user-provided AI APIs
// Stored in localStorage for privacy

export interface CustomApiConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  baseUrl?: string;
  modelId?: string;
  enabled: boolean;
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
