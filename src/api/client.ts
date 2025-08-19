import { APIError } from './errors';
import { RFMConfig } from '../core/types';

export class RFMApiClient {
  private config: RFMConfig;
  private authToken?: string;
  private tokenExpiry?: number;

  constructor(config: RFMConfig) {
    this.config = {
      baseUrl: 'https://api.kumorfm.ai',
      timeout: 30000,
      ...config
    };
  }

  async authenticate(): Promise<void> {
    this.authToken = this.config.apiKey;
    this.tokenExpiry = Date.now() + 3600 * 1000;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.authToken || (this.tokenExpiry && Date.now() >= this.tokenExpiry)) {
      await this.authenticate();
    }
  }

  async request<T = any>(path: string, init?: RequestInit): Promise<T> {
    await this.ensureAuthenticated();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.config.headers || {}),
      Authorization: `Bearer ${this.authToken}`
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);
    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      const txt = await response.text();
      throw new APIError(`Request failed: ${response.status} ${txt}`, response.status);
    }
    return (await response.json()) as T;
  }
}
