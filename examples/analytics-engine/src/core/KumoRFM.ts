import type { PredictionResult, RFMConfig } from './types.js';
import { LocalGraph } from './LocalGraph.js';
import { RFMApiClient } from '../api/client.js';

export class KumoRFM {
  graph: LocalGraph;
  client: RFMApiClient;
  cache: Map<string, unknown>;
  constructor(graph: LocalGraph, config: RFMConfig = {}) {
    this.graph = graph;
    this.client = new RFMApiClient(config);
    this.cache = new Map();
  }

  async predict<T = unknown>(query: string): Promise<PredictionResult<T>> {
    if (this.cache.has(query)) {
      return { query, result: this.cache.get(query) as T, cached: true };
    }
    const res = await this.client.predict(query);
    this.cache.set(query, res.result);
    return { query, result: res.result as T, cached: false };
  }

  async batchPredict(queries: string[]): Promise<PredictionResult[]> {
    return Promise.all(queries.map((q) => this.predict(q)));
  }
}
