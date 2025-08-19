import { LocalTable, LocalGraph, KumoRFM, PQLBuilder } from '../src';

async function main() {
  const users = new LocalTable([
    { user_id: 1, status: 'active', last_seen: '2024-05-01' },
    { user_id: 2, status: 'inactive', last_seen: '2024-03-01' },
    { user_id: 3, status: 'active', last_seen: '2024-05-10' },
  ], 'users').inferMetadata();

  const orders = new LocalTable([
    { order_id: 1, user_id: 1, amount: 20, created_at: '2024-04-15' },
    { order_id: 2, user_id: 1, amount: 35, created_at: '2024-05-12' },
    { order_id: 3, user_id: 2, amount: 15, created_at: '2024-01-04' },
  ], 'orders').inferMetadata();

  const graph = new LocalGraph([users, orders]);
  graph.link('orders', 'user_id', 'users');

  const model = new KumoRFM(graph);

  const query = new PQLBuilder()
    .predict('COUNT(orders.order_id)')
    .for('user_id')
    .where('orders.created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)')
    .build();

  const result = await model.predict(query);
  console.log('Churn prediction result:', result);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
