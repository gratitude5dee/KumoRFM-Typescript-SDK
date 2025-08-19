import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useEffect, useState } from 'react';

export async function loader({ params }: LoaderFunctionArgs) {
  const id = params.id!;
  return json({ id });
}

export default function CustomerInsights() {
  const [churn, setChurn] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cid = new URL(window.location.href).pathname.split('/').pop();
    const fetchJSON = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    };
    (async () => {
      try {
        const churnData = await fetchJSON(`/api/kumorfm?PQL_QUERY_TYPE=churn_prediction&CUSTOMER_ID=${encodeURIComponent(`gid://shopify/Customer/${cid}`)}`);
        setChurn(churnData);
        const recsData = await fetchJSON(`/api/kumorfm?PQL_QUERY_TYPE=product_recommendations&CUSTOMER_ID=${encodeURIComponent(`gid://shopify/Customer/${cid}`)}`);
        setRecs(recsData?.items ?? recsData ?? []);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load insights');
      }
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Customer Insights</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <section>
        <h2>Churn Prediction</h2>
        <pre>{JSON.stringify(churn, null, 2)}</pre>
      </section>
      <section>
        <h2>Top 5 Product Recommendations</h2>
        <pre>{JSON.stringify(recs, null, 2)}</pre>
      </section>
    </div>
  );
}
