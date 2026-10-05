import type { AnalyticsAdminServiceClient } from '@google-analytics/admin';
import { getAuthClientOptions } from './auth.service.js';

let adminClient: AnalyticsAdminServiceClient | null = null;

// The SDK is imported on first use so non-admin commands never pay the gRPC load cost.
// The default export is the v1alpha client: it is the only version that covers every Admin resource.
export async function getAdminClient(): Promise<AnalyticsAdminServiceClient> {
  if (!adminClient) {
    const { AnalyticsAdminServiceClient } = await import('@google-analytics/admin');
    type Ctor = ConstructorParameters<typeof AnalyticsAdminServiceClient>[0];
    adminClient = new AnalyticsAdminServiceClient(getAuthClientOptions() as unknown as Ctor);
  }
  return adminClient;
}
