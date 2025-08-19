export interface ShopifyAdmin {
  graphql: (q: string, vars?: Record<string, any>) => Promise<any>;
}

export async function fetchShopifyData(admin: ShopifyAdmin) {
  const users: any[] = [];
  const items: any[] = [];
  const orders: any[] = [];

  return { users, items, orders };
}
