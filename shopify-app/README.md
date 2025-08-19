# Shopify App Scaffold (Remix + Polaris + App Bridge)

This folder contains a scaffold to help you build an embedded Shopify Admin app that integrates the KumoRFM TypeScript SDK.

Components
- Data Ingestion (server): Fetch Products, Customers, and Orders from Shopify Admin GraphQL API and shape into users/items/orders for KumoRFM.
- Integration Layer (server): Build a LocalGraph from the shaped data and execute PQL queries using @kumo-ai/rfm-sdk.
- Admin UI (client): Embedded Remix routes using Shopify Polaris and App Bridge to display insights like churn probability and product recommendations.

Prerequisites
- Shopify Partner account and a store to install apps on
- Node.js 18+
- .env with KUMO_API_KEY

1) Create a Shopify Remix app
npm init @shopify/app@latest -- --template https://github.com/Shopify/shopify-app-template-remix

2) Required scopes in shopify.app.toml
- read_products
- read_customers
- read_orders

3) Install KumoRFM SDK
npm install @kumo-ai/rfm-sdk

4) Set KUMO_API_KEY
Add KUMO_API_KEY to your app .env and ensure it is available in Remix server environment.

5) Copy these stubs
Copy the files under shopify-app/app/* into your Remix app at the same paths:
- app/lib/shopify-data.server.ts
- app/lib/kumorfm.server.ts
- app/routes/api.kumorfm.tsx
- app/routes/app.customer.$id.tsx
- app/routes/app._index.tsx

Phase Checklist

Phase 1: Data Ingestion
- Implement app/lib/shopify-data.server.ts
  - Use Admin GraphQL client
  - Handle pagination via pageInfo.hasNextPage/endCursor
  - Respect rate limits using response.extensions.cost
  - Shape data:
    - users: { id, firstName, lastName, email, createdAt }
    - items: { id, title, handle, productType, vendor, createdAt }
    - orders: { id, customer_id, item_id, price, date } one row per line item

Phase 2: Integration and API
- Implement app/lib/kumorfm.server.ts to initialize KumoRFM with LocalGraph
- Create app/routes/api.kumorfm.tsx loader-only resource endpoint
- Support PQL_QUERY_TYPE=product_recommendations|churn_prediction and CUSTOMER_ID

Phase 3: Admin UI
- app/routes/app.customer.$id.tsx: Customer detail page with churn probability and top recommendations
- app/routes/app._index.tsx: Dashboard with "Sync Data with KumoRFM" button to prefetch/cache data

Verification
- Checkpoint 1: Log/inspect users/items/orders shapes
- Checkpoint 2: curl /api/kumorfm?PQL_QUERY_TYPE=churn_prediction&CUSTOMER_ID=gid://shopify/Customer/123
- Checkpoint 3: npm run dev, sync, navigate to customer page, verify insights

Notes
- These files are templates and not runnable in this repo; paste them into your Shopify app.
- This scaffold is excluded from npm packaging.
