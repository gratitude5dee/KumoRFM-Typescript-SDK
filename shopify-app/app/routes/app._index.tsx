import { useFetcher } from '@remix-run/react';

export async function action() {
  return null;
}

export default function Dashboard() {
  const fetcher = useFetcher();
  return (
    <div style={{ padding: 16 }}>
      <h1>KumoRFM Dashboard</h1>
      <fetcher.Form method="post">
        <button type="submit" disabled={fetcher.state !== 'idle'}>
          {fetcher.state === 'submitting' ? 'Syncing…' : 'Sync Data with KumoRFM'}
        </button>
      </fetcher.Form>
      <p>This triggers background data sync and caching to avoid re-fetching on each page load.</p>
    </div>
  );
}
