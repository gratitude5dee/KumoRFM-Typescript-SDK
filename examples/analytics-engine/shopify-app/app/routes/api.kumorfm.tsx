import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { fetchShopifyData } from '../lib/shopify-data.server.js';
import { getKumoRfmForShop } from '../lib/kumorfm.server.js';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const queryType = url.searchParams.get('PQL_QUERY_TYPE');
  const customerId = url.searchParams.get('CUSTOMER_ID');

  const { users, items, orders } = await fetchShopifyData({ graphql: async () => ({}) });
  const rfm = await getKumoRfmForShop(users, items, orders);

  let query: string | null = null;
  if (queryType === 'product_recommendations' && customerId) {
    query = `PREDICT LIST_DISTINCT(orders.item_id, 0, 30, days) RANK TOP 5 FOR users.id='${customerId}'`;
  } else if (queryType === 'churn_prediction' && customerId) {
    query = `PREDICT COUNT(orders.*, 0, 90, days)=0 FOR users.id='${customerId}'`;
  }

  if (!query) return json({ error: 'Missing or invalid PQL_QUERY_TYPE or CUSTOMER_ID' }, { status: 400 });
  const result = await rfm.predict(query);
  return json(result);
}
