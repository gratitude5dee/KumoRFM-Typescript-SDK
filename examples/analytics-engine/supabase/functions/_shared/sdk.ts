import { KumoRFM, LocalGraph, LocalTable } from "../../../src/index.ts";

export function deserializeGraph(payload: {
  users: Record<string, unknown>[];
  items: Record<string, unknown>[];
  orders: Record<string, unknown>[];
}): LocalGraph {
  const users = new LocalTable(payload.users, "users").inferMetadata();
  const items = new LocalTable(payload.items, "items").inferMetadata();
  const orders = new LocalTable(payload.orders, "orders").inferMetadata();
  const graph = new LocalGraph([users, items, orders]);
  graph.link("orders", "customer_id", "users");
  graph.link("orders", "item_id", "items");
  return graph;
}

export function createRFMClient(graph: LocalGraph) {
  const apiKey = Deno.env.get("KUMO_API_KEY") ?? "";
  return new KumoRFM(graph, { apiKey });
}
