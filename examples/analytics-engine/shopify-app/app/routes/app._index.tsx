import { Page, Card, Button, Text } from '@shopify/polaris';
import { useFetcher } from '@remix-run/react';

export async function action() {
  return null;
}

export default function Index() {
  const fetcher = useFetcher();
  return (
    <Page title="Analytics Dashboard">
      <Card>
        <Button onClick={() => fetcher.submit({}, { method: 'post' })}>Sync Data with KumoRFM</Button>
        <Text as="p" variant="bodyMd">Sync job will run in background.</Text>
      </Card>
    </Page>
  );
}
