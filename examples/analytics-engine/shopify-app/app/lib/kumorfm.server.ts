import { KumoRFM, LocalGraph, LocalTable } from '../../../../../src/index.js';

interface User {
  id: string;
}
interface Item {
  id: string;
}
interface Order {
  id: string;
  customer_id: string;
  item_id: string;
}

export async function getKumoRfmForShop(users: User[], items: Item[], orders: Order[]) {
  const usersTable = new LocalTable(users, 'users').inferMetadata();
  const itemsTable = new LocalTable(items, 'items').inferMetadata();
  const ordersTable = new LocalTable(orders, 'orders').inferMetadata();

  const graph = new LocalGraph([usersTable, itemsTable, ordersTable]);
  graph.link('orders', 'customer_id', 'users');
  graph.link('orders', 'item_id', 'items');

  return new KumoRFM(graph, { apiKey: process.env.KUMO_API_KEY || '' });
}
