import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
type Authenticate = { admin: (req: Request) => Promise<{ admin: { graphql: Function } }> };

import { fetchShopifyData } from '~/lib/shopify-data.server';
import { getKumoRfmForShop } from '~/lib/kumorfm.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const queryType = url.searchParams.get('PQL_QUERY_TYPE');
  const customerId = url.searchParams.get('CUSTOMER_ID');

  const { admin } = ({} as unknown) as Awaited<ReturnType<Authenticate['admin']>>;

  const { users, items, orders } = await fetchShopifyData(admin as any);
  const rfm = await getKumoRfmForShop(users, items, orders);

  if (!queryType || !customerId) {
    return json({ error: 'Missing PQL_QUERY_TYPE or CUSTOMER_ID' }, { status: 400 });
  }

  let query: string;
  if (queryType === 'product_recommendations') {
    query = `PREDICT LIST_DISTINCT(orders.item_id, 0, 30, days) RANK TOP 5 FOR users.id='${customerId}'`;
  } else if (queryType === 'churn_prediction') {
    query = `PREDICT COUNT(orders.*, 0, 90, days)=0 FOR users.id='${customerId}'`;
  } else {
    return json({ error: 'Invalid PQL_QUERY_TYPE' }, { status: 400 });
  }

  const result = await rfm.predict(query);
  return json(result);
}
