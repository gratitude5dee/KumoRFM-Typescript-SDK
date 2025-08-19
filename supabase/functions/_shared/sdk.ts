import { KumoRFM, LocalGraph, LocalTable, PQLBuilder, type RFMConfig } from '../../../src/index.ts';
import type { SerializedGraph, SerializedTable } from './types';

export function deserializeTable(serialized: SerializedTable): LocalTable {
  const table = new LocalTable(serialized.data, serialized.name, serialized.metadata);
  if (serialized.metadata) {
    return table;
  }
  return table.inferMetadata();
}

export function deserializeGraph(serialized: SerializedGraph): LocalGraph {
  const tables = serialized.tables.map(deserializeTable);
  const graph = new LocalGraph(tables);
  for (const link of serialized.links) {
    graph.link(link.srcTable, link.fkey, link.dstTable);
  }
  return graph;
}

export function serializeGraph(graph: LocalGraph): SerializedGraph {
  return {
    tables: graph.tables.map((table) => ({
      name: table.name,
      data: table.data,
      metadata: table.metadata,
    })),
    links: graph.links,
  };
}

export function createRFMClient(graph: LocalGraph): KumoRFM {
  const config: RFMConfig = {
    apiKey: Deno.env.get('KUMO_API_KEY')!,
    baseUrl: Deno.env.get('KUMO_BASE_URL') || 'https://api.kumorfm.ai',
    timeout: 60000,
    maxRetries: 3,
  };
  return new KumoRFM(graph, config);
}

export { PQLBuilder };
