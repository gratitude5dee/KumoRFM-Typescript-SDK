import { KumoRFM, LocalGraph, LocalTable } from '../../../../../src/index.js';

export function deserializeGraph(payload: {
  users: any[];
  items: any[];
  orders: any[];
}): LocalGraph {
  const users = new LocalTable(payload.users, 'users').inferMetadata();
  const items = new LocalTable(payload.items, 'items').inferMetadata();
  const orders = new LocalTable(payload.orders, 'orders').inferMetadata();
  const graph = new LocalGraph([users, items, orders]);
  graph.link('orders', 'customer_id', 'users');
  graph.link('orders', 'item_id', 'items');
  return graph;
}

export function createRFMClient(graph: LocalGraph) {
  return new KumoRFM(graph, { apiKey: Deno.env.get('KUMO_API_KEY') ?? '' });
}
