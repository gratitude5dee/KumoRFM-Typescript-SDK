import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useEffect, useState } from 'react';
import { Page, Card, ResourceList, Text, Badge } from '@shopify/polaris';

export async function loader({ params }: LoaderFunctionArgs) {
  return json({ customerId: params.id });
}

export default function CustomerInsights() {
  const [churn, setChurn] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  useEffect(() => {
    const id = 'gid://shopify/Customer/1';
    fetch(`/api/kumorfm?PQL_QUERY_TYPE=churn_prediction&CUSTOMER_ID=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then(setChurn);
    fetch(
      `/api/kumorfm?PQL_QUERY_TYPE=product_recommendations&CUSTOMER_ID=${encodeURIComponent(id)}`,
    )
      .then((r) => r.json())
      .then((d) => setRecs(d?.result ?? []));
  }, []);
  return (
    <Page title="Customer Insights">
      <Card>
        <Text as="h2" variant="headingMd">
          Churn Prediction
        </Text>
        <Badge status="warning">{churn ? 'Risk' : 'Unknown'}</Badge>
      </Card>
      <Card>
        <Text as="h2" variant="headingMd">
          Recommendations
        </Text>
        <ResourceList
          items={recs}
          renderItem={(item) => (
            <ResourceList.Item id={String(item)}>{String(item)}</ResourceList.Item>
          )}
        />
      </Card>
    </Page>
  );
}
