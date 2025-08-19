type JSONObject = Record<string, unknown>;

export interface ShopifyAdmin {
  graphql: (q: string, vars?: Record<string, unknown>) => Promise<JSONObject>;
}

interface UserRow {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  createdAt?: string | null;
}

interface ItemRow {
  id: string;
  title?: string | null;
  handle?: string | null;
  productType?: string | null;
  vendor?: string | null;
  createdAt?: string | null;
}

interface OrderRow {
  id: string;
  customer_id: string;
  item_id: string;
  price?: string | null;
  date?: string | null;
}

export async function fetchShopifyData(admin: ShopifyAdmin): Promise<{
  users: UserRow[];
  items: ItemRow[];
  orders: OrderRow[];
}> {
  const users: UserRow[] = [];
  const items: ItemRow[] = [];
  const orders: OrderRow[] = [];

  const customersQuery = `
    query Customers($after: String) {
      customers(first: 250, after: $after) {
        edges {
          cursor
          node {
            id
            firstName
            lastName
            email
            createdAt
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  const productsQuery = `
    query Products($after: String) {
      products(first: 250, after: $after) {
        edges {
          cursor
          node {
            id
            title
            handle
            productType
            vendor
            createdAt
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  const ordersQuery = `
    query Orders($after: String) {
      orders(first: 100, after: $after) {
        edges {
          cursor
          node {
            id
            processedAt
            customer { id }
            lineItems(first: 250) {
              edges {
                node {
                  product { id }
                  originalTotalSet {
                    shopMoney { amount }
                  }
                }
              }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  let after: string | null = null;

  do {
    const result = (await admin.graphql(customersQuery, { after })) as JSONObject;
    const data = result?.["data"] as JSONObject | undefined;
    const customers = data?.["customers"] as JSONObject | undefined;
    const edges = (customers?.["edges"] as JSONObject[] | undefined) ?? [];
    for (const edge of edges) {
      const node = edge?.["node"] as JSONObject | undefined;
      if (!node) continue;
      users.push({
        id: String(node["id"]),
        firstName: (node["firstName"] as string | null | undefined) ?? null,
        lastName: (node["lastName"] as string | null | undefined) ?? null,
        email: (node["email"] as string | null | undefined) ?? null,
        createdAt: (node["createdAt"] as string | null | undefined) ?? null,
      });
    }
    const pageInfo = customers?.["pageInfo"] as JSONObject | undefined;
    const hasNextPage = Boolean(pageInfo?.["hasNextPage"]);
    after = hasNextPage ? (pageInfo?.["endCursor"] as string | null | undefined) ?? null : null;
  } while (after);

  after = null;

  do {
    const result = (await admin.graphql(productsQuery, { after })) as JSONObject;
    const data = result?.["data"] as JSONObject | undefined;
    const products = data?.["products"] as JSONObject | undefined;
    const edges = (products?.["edges"] as JSONObject[] | undefined) ?? [];
    for (const edge of edges) {
      const node = edge?.["node"] as JSONObject | undefined;
      if (!node) continue;
      items.push({
        id: String(node["id"]),
        title: (node["title"] as string | null | undefined) ?? null,
        handle: (node["handle"] as string | null | undefined) ?? null,
        productType: (node["productType"] as string | null | undefined) ?? null,
        vendor: (node["vendor"] as string | null | undefined) ?? null,
        createdAt: (node["createdAt"] as string | null | undefined) ?? null,
      });
    }
    const pageInfo = products?.["pageInfo"] as JSONObject | undefined;
    const hasNextPage = Boolean(pageInfo?.["hasNextPage"]);
    after = hasNextPage ? (pageInfo?.["endCursor"] as string | null | undefined) ?? null : null;
  } while (after);

  after = null;

  do {
    const result = (await admin.graphql(ordersQuery, { after })) as JSONObject;
    const data = result?.["data"] as JSONObject | undefined;
    const ordersConn = data?.["orders"] as JSONObject | undefined;
    const edges = (ordersConn?.["edges"] as JSONObject[] | undefined) ?? [];
    for (const edge of edges) {
      const node = edge?.["node"] as JSONObject | undefined;
      if (!node) continue;
      const orderId = String(node["id"]);
      const date = (node["processedAt"] as string | null | undefined) ?? null;
      const customer = node["customer"] as JSONObject | undefined;
      const customerId = customer?.["id"] ? String(customer["id"]) : "";
      const lineItems = (node["lineItems"] as JSONObject | undefined)?.["edges"] as
        | JSONObject[]
        | undefined;
      for (const li of lineItems ?? []) {
        const liNode = li?.["node"] as JSONObject | undefined;
        const product = liNode?.["product"] as JSONObject | undefined;
        const itemId = product?.["id"] ? String(product["id"]) : "";
        const money = (liNode?.["originalTotalSet"] as JSONObject | undefined)?.["shopMoney"] as
          | JSONObject
          | undefined;
        const price = (money?.["amount"] as string | null | undefined) ?? null;
        orders.push({
          id: orderId,
          customer_id: customerId,
          item_id: itemId,
          price,
          date,
        });
      }
    }
    const pageInfo = ordersConn?.["pageInfo"] as JSONObject | undefined;
    const hasNextPage = Boolean(pageInfo?.["hasNextPage"]);
    after = hasNextPage ? (pageInfo?.["endCursor"] as string | null | undefined) ?? null : null;
  } while (after);

  return { users, items, orders };
}
