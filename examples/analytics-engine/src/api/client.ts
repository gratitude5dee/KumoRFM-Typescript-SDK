import type { RFMConfig } from '../core/types.js';

export class RFMApiClient {
  config: RFMConfig;
  constructor(config: RFMConfig = {}) {
    this.config = config;
  }
  async predict(_query: string): Promise<{ result: unknown; cached: boolean }> {
    return { result: { mock: true }, cached: false };
  }
}
