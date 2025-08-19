import { KumoRFM, LocalGraph, LocalTable } from '@kumo-ai/rfm-sdk';

export interface User { id: string; firstName?: string | null; lastName?: string | null; email?: string | null; createdAt?: string | null }
export interface Item { id: string; title?: string | null; handle?: string | null; productType?: string | null; vendor?: string | null; createdAt?: string | null }
export interface Order { id: string; customer_id: string; item_id: string; price?: number; date?: string }

export async function getKumoRfmForShop(users: User[], items: Item[], orders: Order[]) {
  const usersTable = new LocalTable(users, 'users').inferMetadata();
  const itemsTable = new LocalTable(items, 'items').inferMetadata();
  const ordersTable = new LocalTable(orders, 'orders').inferMetadata();

  const graph = new LocalGraph([usersTable, itemsTable, ordersTable]);
  graph.link('orders', 'customer_id', 'users');
  graph.link('orders', 'item_id', 'items');

  return new KumoRFM(graph, { apiKey: process.env.KUMO_API_KEY! });
}
