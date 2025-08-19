export interface ShopifyAdmin {
  graphql: (query: string, variables?: Record<string, any>) => Promise<{
    data?: any;
    extensions?: { cost?: { requestedQueryCost?: number; actualQueryCost?: number; throttleStatus?: { currentlyAvailable: number; maximumAvailable: number; restoreRate: number } } };
    errors?: any[];
  }>;
}

type Cursor = string | null;

async function paginate<T>(admin: ShopifyAdmin, query: string, path: string[], pageSize = 100): Promise<T[]> {
  const results: T[] = [];
  let cursor: Cursor = null;
  while (true) {
    const variables = { cursor, pageSize };
    const res = await admin.graphql(query, variables);
    if (res.errors) throw new Error(`Shopify GraphQL error: ${JSON.stringify(res.errors)}`);
    let node: any = res.data;
    for (const p of path) node = node?.[p];
    const edges: any[] = node?.edges ?? [];
    for (const e of edges) results.push(e.node as T);
    const pageInfo = node?.pageInfo;
    if (!pageInfo?.hasNextPage) break;
    cursor = edges[edges.length - 1]?.cursor ?? null;
  }
  return results;
}

export interface User {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  createdAt?: string | null;
}

export interface Item {
  id: string;
  title?: string | null;
  handle?: string | null;
  productType?: string | null;
  vendor?: string | null;
  createdAt?: string | null;
  image?: { url?: string | null } | null;
}

export interface Order {
  id: string;
  customer_id: string;
  item_id: string;
  price?: number;
  date?: string;
}

const CUSTOMERS_QUERY = /* GraphQL */ `
  query Customers($cursor: String, $pageSize: Int!) {
    customers(first: $pageSize, after: $cursor, sortKey: CREATED_AT) {
      edges { cursor node { id firstName lastName email createdAt } }
      pageInfo { hasNextPage }
    }
  }
`;

const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($cursor: String, $pageSize: Int!) {
    products(first: $pageSize, after: $cursor, sortKey: CREATED_AT) {
      edges { cursor node { id title handle productType vendor createdAt featuredImage { url } } }
      pageInfo { hasNextPage }
    }
  }
`;

const ORDERS_QUERY = /* GraphQL */ `
  query Orders($cursor: String, $pageSize: Int!) {
    orders(first: $pageSize, after: $cursor, sortKey: PROCESSED_AT) {
      edges {
        cursor
        node {
          id
          processedAt
          customer { id }
          lineItems(first: 100) {
            edges {
              node {
                product { id }
                originalTotalSet { shopMoney { amount } }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage }
    }
  }
`;

export async function fetchShopifyData(admin: ShopifyAdmin): Promise<{ users: User[]; items: Item[]; orders: Order[] }> {
  const [customers, products, orders] = await Promise.all([
    paginate<any>(admin, CUSTOMERS_QUERY, ['customers']),
    paginate<any>(admin, PRODUCTS_QUERY, ['products']),
    paginate<any>(admin, ORDERS_QUERY, ['orders']),
  ]);

  const users: User[] = customers.map((c: any) => ({
    id: c.id,
    firstName: c.firstName ?? null,
    lastName: c.lastName ?? null,
    email: c.email ?? null,
    createdAt: c.createdAt ?? null,
  }));

  const items: Item[] = products.map((p: any) => ({
    id: p.id,
    title: p.title ?? null,
    handle: p.handle ?? null,
    productType: p.productType ?? null,
    vendor: p.vendor ?? null,
    createdAt: p.createdAt ?? null,
    image: p.featuredImage ? { url: p.featuredImage.url ?? null } : null,
  }));

  const orderRows: Order[] = [];
  for (const o of orders) {
    const base = {
      id: o.id as string,
      customerId: o.customer?.id as string | undefined,
      date: o.processedAt as string | undefined,
    };
    const lines: any[] = o.lineItems?.edges?.map((e: any) => e.node) ?? [];
    for (const ln of lines) {
      const itemId = ln.product?.id as string | undefined;
      if (!base.customerId || !itemId) continue;
      const price = Number(ln.originalTotalSet?.shopMoney?.amount ?? 0);
      orderRows.push({
        id: base.id,
        customer_id: base.customerId,
        item_id: itemId,
        price: isFinite(price) ? price : undefined,
        date: base.date,
      });
    }
  }

  return { users, items, orders: orderRows };
}
