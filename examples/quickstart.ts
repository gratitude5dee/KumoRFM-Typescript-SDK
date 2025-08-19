import { LocalTable, LocalGraph, KumoRFM, PQLBuilder } from '../src';

async function main() {
  const usersData = [
    { user_id: 1, name: 'Alice', signup_date: '2024-01-01' },
    { user_id: 2, name: 'Bob', signup_date: '2024-01-02' },
  ];

  const ordersData = [
    { order_id: 1, user_id: 1, amount: 99.99, created_at: '2024-02-01' },
    { order_id: 2, user_id: 2, amount: 149.99, created_at: '2024-02-15' },
  ];

  const users = new LocalTable(usersData, 'users').inferMetadata();
  const orders = new LocalTable(ordersData, 'orders').inferMetadata();

  const graph = new LocalGraph([users, orders]);
  graph.link('orders', 'user_id', 'users');

  const model = new KumoRFM(graph);

  const query = new PQLBuilder()
    .predict('SUM(orders.amount)')
    .for('user_id')
    .where('orders.created_at > "2024-01-01"')
    .build();

  const results = await model.predict(query);
  console.log('Predictions:', results.predictions);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
