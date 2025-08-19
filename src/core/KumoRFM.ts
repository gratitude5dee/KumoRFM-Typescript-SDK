import { LocalGraph } from './LocalGraph';
import { PredictionResult, RFMConfig } from './types';
import { PQLBuilder } from '../query/builder';

export class KumoRFM {
  private graph: LocalGraph;
  private config?: RFMConfig;
  private cache: Map<string, PredictionResult> = new Map();

  constructor(graph: LocalGraph, config?: RFMConfig) {
    this.graph = graph;
    this.config = config;
  }

  async predict(query: string, options?: { useCache?: boolean; timeout?: number }): Promise<PredictionResult> {
    const key = `${query}`;
    if (options?.useCache && this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const start = Date.now();
    const result: PredictionResult = {
      query,
      predictions: [],
      metadata: {
        executionTime: Date.now() - start,
        rowCount: 0
      }
    };
    if (options?.useCache) {
      this.cache.set(key, result);
    }
    return result;
  }

  async batchPredict(queries: string[], _opts?: { concurrency?: number; useCache?: boolean }): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];
    for (const q of queries) {
      results.push(await this.predict(q, _opts));
    }
    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getGraph(): LocalGraph {
    return this.graph;
  }

  updateGraph(graph: LocalGraph): void {
    this.graph = graph;
  }
}

export { PQLBuilder };
