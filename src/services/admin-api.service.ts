import { AnalyticsAdminServiceClient } from '@google-analytics/admin';
import { getAuthClientOptions } from './auth.service.js';
import type {
  CreatePropertyParams, UpdatePropertyParams,
  CreateDataStreamParams, UpdateDataStreamParams,
  CreateCustomDimensionParams, UpdateCustomDimensionParams,
  CreateCustomMetricParams, UpdateCustomMetricParams,
  CreateKeyEventParams, UpdateKeyEventParams,
  CreateAudienceParams, UpdateAudienceParams,
  CreateAccessBindingParams, UpdateAccessBindingParams,
  CreateFirebaseLinkParams,
  CreateGoogleAdsLinkParams, UpdateGoogleAdsLinkParams,
  CreateBigQueryLinkParams,
} from '../types/admin-api.js';

let adminClient: AnalyticsAdminServiceClient | null = null;

function getClient(): AnalyticsAdminServiceClient {
  if (!adminClient) {
    adminClient = new AnalyticsAdminServiceClient({ ...getAuthClientOptions() } as any);
  }
  return adminClient;
}

// Accounts
export async function listAccounts(): Promise<any[]> {
  const c = getClient();
  const [accounts] = await c.listAccounts({});
  return accounts || [];
}

// Properties
export async function listProperties(accountId: string): Promise<any[]> {
  const c = getClient();
  const [properties] = await c.listProperties({
    filter: `parent:accounts/${accountId}`,
  });
  return properties || [];
}

export async function getProperty(propertyId: string): Promise<any> {
  const c = getClient();
  const [property] = await c.getProperty({ name: `properties/${propertyId}` });
  return property;
}

export async function createProperty(params: CreatePropertyParams): Promise<any> {
  const c = getClient();
  const [property] = await c.createProperty({
    property: {
      displayName: params.displayName,
      parent: params.parent,
      timeZone: params.timeZone || 'America/Los_Angeles',
      currencyCode: params.currencyCode || 'USD',
      industryCategory: params.industryCategory as any,
    },
  });
  return property;
}

export async function updateProperty(params: UpdatePropertyParams): Promise<any> {
  const c = getClient();
  const updateMask: string[] = [];
  const property: any = { name: params.name };

  if (params.displayName) { property.displayName = params.displayName; updateMask.push('display_name'); }
  if (params.timeZone) { property.timeZone = params.timeZone; updateMask.push('time_zone'); }
  if (params.currencyCode) { property.currencyCode = params.currencyCode; updateMask.push('currency_code'); }
  if (params.industryCategory) { property.industryCategory = params.industryCategory; updateMask.push('industry_category'); }

  const [result] = await c.updateProperty({
    property,
    updateMask: { paths: updateMask },
  });
  return result;
}

export async function deleteProperty(propertyId: string): Promise<void> {
  const c = getClient();
  await c.deleteProperty({ name: `properties/${propertyId}` });
}

// Data Streams
export async function listDataStreams(propertyId: string): Promise<any[]> {
  const c = getClient();
  const [streams] = await c.listDataStreams({ parent: `properties/${propertyId}` });
  return streams || [];
}

export async function getDataStream(name: string): Promise<any> {
  const c = getClient();
  const [stream] = await c.getDataStream({ name });
  return stream;
}

export async function createDataStream(params: CreateDataStreamParams): Promise<any> {
  const c = getClient();
  const [stream] = await c.createDataStream({
    parent: params.parent,
    dataStream: {
      type: params.type as any,
      displayName: params.displayName,
      webStreamData: params.webStreamData as any,
      androidAppStreamData: params.androidAppStreamData as any,
      iosAppStreamData: params.iosAppStreamData as any,
    },
  });
  return stream;
}

export async function updateDataStream(params: UpdateDataStreamParams): Promise<any> {
  const c = getClient();
  const [stream] = await c.updateDataStream({
    dataStream: { name: params.name, displayName: params.displayName },
    updateMask: { paths: ['display_name'] },
  });
  return stream;
}

export async function deleteDataStream(name: string): Promise<void> {
  const c = getClient();
  await c.deleteDataStream({ name });
}

// Custom Dimensions
export async function listCustomDimensions(propertyId: string): Promise<any[]> {
  const c = getClient();
  const [dimensions] = await c.listCustomDimensions({ parent: `properties/${propertyId}` });
  return dimensions || [];
}

export async function getCustomDimension(name: string): Promise<any> {
  const c = getClient();
  const [dimension] = await (c as any).getCustomDimension({ name });
  return dimension;
}

export async function createCustomDimension(params: CreateCustomDimensionParams): Promise<any> {
  const c = getClient();
  const [dimension] = await c.createCustomDimension({
    parent: params.parent,
    customDimension: {
      parameterName: params.parameterName,
      displayName: params.displayName,
      description: params.description || '',
      scope: params.scope as any,
      disallowAdsPersonalization: params.disallowAdsPersonalization || false,
    },
  });
  return dimension;
}

export async function updateCustomDimension(params: UpdateCustomDimensionParams): Promise<any> {
  const c = getClient();
  const updateMask: string[] = [];
  const cd: any = { name: params.name };
  if (params.displayName) { cd.displayName = params.displayName; updateMask.push('display_name'); }
  if (params.description !== undefined) { cd.description = params.description; updateMask.push('description'); }
  if (params.disallowAdsPersonalization !== undefined) {
    cd.disallowAdsPersonalization = params.disallowAdsPersonalization;
    updateMask.push('disallow_ads_personalization');
  }
  const [dimension] = await c.updateCustomDimension({
    customDimension: cd,
    updateMask: { paths: updateMask },
  });
  return dimension;
}

export async function archiveCustomDimension(name: string): Promise<void> {
  const c = getClient();
  await c.archiveCustomDimension({ name });
}

// Custom Metrics
export async function listCustomMetrics(propertyId: string): Promise<any[]> {
  const c = getClient();
  const [metrics] = await c.listCustomMetrics({ parent: `properties/${propertyId}` });
  return metrics || [];
}

export async function getCustomMetric(name: string): Promise<any> {
  const c = getClient();
  const [metric] = await (c as any).getCustomMetric({ name });
  return metric;
}

export async function createCustomMetric(params: CreateCustomMetricParams): Promise<any> {
  const c = getClient();
  const [metric] = await c.createCustomMetric({
    parent: params.parent,
    customMetric: {
      parameterName: params.parameterName,
      displayName: params.displayName,
      description: params.description || '',
      scope: params.scope as any,
      measurementUnit: params.measurementUnit as any,
      restrictedMetricType: params.restrictedMetricType as any,
    },
  });
  return metric;
}

export async function updateCustomMetric(params: UpdateCustomMetricParams): Promise<any> {
  const c = getClient();
  const updateMask: string[] = [];
  const cm: any = { name: params.name };
  if (params.displayName) { cm.displayName = params.displayName; updateMask.push('display_name'); }
  if (params.description !== undefined) { cm.description = params.description; updateMask.push('description'); }
  if (params.measurementUnit) { cm.measurementUnit = params.measurementUnit; updateMask.push('measurement_unit'); }
  const [metric] = await c.updateCustomMetric({
    customMetric: cm,
    updateMask: { paths: updateMask },
  });
  return metric;
}

export async function archiveCustomMetric(name: string): Promise<void> {
  const c = getClient();
  await c.archiveCustomMetric({ name });
}

// Key Events
export async function listKeyEvents(propertyId: string): Promise<any[]> {
  const c = getClient();
  const [events] = await (c as any).listKeyEvents({ parent: `properties/${propertyId}` });
  return events || [];
}

export async function getKeyEvent(name: string): Promise<any> {
  const c = getClient();
  const [event] = await (c as any).getKeyEvent({ name });
  return event;
}

export async function createKeyEvent(params: CreateKeyEventParams): Promise<any> {
  const c = getClient();
  const [event] = await (c as any).createKeyEvent({
    parent: params.parent,
    keyEvent: {
      eventName: params.eventName,
      countingMethod: params.countingMethod,
      defaultValue: params.defaultValue,
    },
  });
  return event;
}

export async function updateKeyEvent(params: UpdateKeyEventParams): Promise<any> {
  const c = getClient();
  const updateMask: string[] = [];
  const ke: any = { name: params.name };
  if (params.countingMethod) { ke.countingMethod = params.countingMethod; updateMask.push('counting_method'); }
  if (params.defaultValue) { ke.defaultValue = params.defaultValue; updateMask.push('default_value'); }
  const [event] = await (c as any).updateKeyEvent({
    keyEvent: ke,
    updateMask: { paths: updateMask },
  });
  return event;
}

export async function deleteKeyEvent(name: string): Promise<void> {
  const c = getClient();
  await (c as any).deleteKeyEvent({ name });
}

// Audiences
export async function listAudiences(propertyId: string): Promise<any[]> {
  const c = getClient();
  const [audiences] = await (c as any).listAudiences({ parent: `properties/${propertyId}` });
  return audiences || [];
}

export async function getAudience(name: string): Promise<any> {
  const c = getClient();
  const [audience] = await (c as any).getAudience({ name });
  return audience;
}

export async function createAudience(params: CreateAudienceParams): Promise<any> {
  const c = getClient();
  const [audience] = await (c as any).createAudience({
    parent: params.parent,
    audience: {
      displayName: params.displayName,
      description: params.description || '',
      membershipDurationDays: params.membershipDurationDays,
      filterClauses: params.filterClauses,
      adsPersonalizationEnabled: params.adsPersonalizationEnabled ?? true,
    },
  });
  return audience;
}

export async function updateAudience(params: UpdateAudienceParams): Promise<any> {
  const c = getClient();
  const updateMask: string[] = [];
  const aud: any = { name: params.name };
  if (params.displayName) { aud.displayName = params.displayName; updateMask.push('display_name'); }
  if (params.description !== undefined) { aud.description = params.description; updateMask.push('description'); }
  if (params.adsPersonalizationEnabled !== undefined) {
    aud.adsPersonalizationEnabled = params.adsPersonalizationEnabled;
    updateMask.push('ads_personalization_enabled');
  }
  const [audience] = await (c as any).updateAudience({
    audience: aud,
    updateMask: { paths: updateMask },
  });
  return audience;
}

export async function archiveAudience(name: string): Promise<void> {
  const c = getClient();
  await (c as any).archiveAudience({ name });
}

// Access Bindings
export async function listAccessBindings(parent: string): Promise<any[]> {
  const c = getClient();
  const [bindings] = await (c as any).listAccessBindings({ parent });
  return bindings || [];
}

export async function getAccessBinding(name: string): Promise<any> {
  const c = getClient();
  const [binding] = await (c as any).getAccessBinding({ name });
  return binding;
}

export async function createAccessBinding(params: CreateAccessBindingParams): Promise<any> {
  const c = getClient();
  const [binding] = await (c as any).createAccessBinding({
    parent: params.parent,
    accessBinding: {
      user: params.user,
      roles: params.roles,
    },
  });
  return binding;
}

export async function updateAccessBinding(params: UpdateAccessBindingParams): Promise<any> {
  const c = getClient();
  const [binding] = await (c as any).updateAccessBinding({
    accessBinding: {
      name: params.name,
      roles: params.roles,
    },
  });
  return binding;
}

export async function deleteAccessBinding(name: string): Promise<void> {
  const c = getClient();
  await (c as any).deleteAccessBinding({ name });
}

// Firebase Links
export async function listFirebaseLinks(propertyId: string): Promise<any[]> {
  const c = getClient();
  const [links] = await (c as any).listFirebaseLinks({ parent: `properties/${propertyId}` });
  return links || [];
}

export async function getFirebaseLink(name: string): Promise<any> {
  const c = getClient();
  const [link] = await (c as any).getFirebaseLink({ name });
  return link;
}

export async function createFirebaseLink(params: CreateFirebaseLinkParams): Promise<any> {
  const c = getClient();
  const [link] = await (c as any).createFirebaseLink({
    parent: params.parent,
    firebaseLink: { project: params.project },
  });
  return link;
}

export async function deleteFirebaseLink(name: string): Promise<void> {
  const c = getClient();
  await (c as any).deleteFirebaseLink({ name });
}

// Google Ads Links
export async function listGoogleAdsLinks(propertyId: string): Promise<any[]> {
  const c = getClient();
  const [links] = await (c as any).listGoogleAdsLinks({ parent: `properties/${propertyId}` });
  return links || [];
}

export async function getGoogleAdsLink(name: string): Promise<any> {
  const c = getClient();
  const [link] = await (c as any).getGoogleAdsLink({ name });
  return link;
}

export async function createGoogleAdsLink(params: CreateGoogleAdsLinkParams): Promise<any> {
  const c = getClient();
  const [link] = await (c as any).createGoogleAdsLink({
    parent: params.parent,
    googleAdsLink: {
      customerId: params.customerId,
      adsPersonalizationEnabled: params.adsPersonalizationEnabled ?? true,
    },
  });
  return link;
}

export async function updateGoogleAdsLink(params: UpdateGoogleAdsLinkParams): Promise<any> {
  const c = getClient();
  const [link] = await (c as any).updateGoogleAdsLink({
    googleAdsLink: {
      name: params.name,
      adsPersonalizationEnabled: params.adsPersonalizationEnabled,
    },
    updateMask: { paths: ['ads_personalization_enabled'] },
  });
  return link;
}

export async function deleteGoogleAdsLink(name: string): Promise<void> {
  const c = getClient();
  await (c as any).deleteGoogleAdsLink({ name });
}

// BigQuery Links
export async function listBigQueryLinks(propertyId: string): Promise<any[]> {
  const c = getClient();
  const [links] = await (c as any).listBigQueryLinks({ parent: `properties/${propertyId}` });
  return links || [];
}

export async function getBigQueryLink(name: string): Promise<any> {
  const c = getClient();
  const [link] = await (c as any).getBigQueryLink({ name });
  return link;
}

export async function createBigQueryLink(params: CreateBigQueryLinkParams): Promise<any> {
  const c = getClient();
  const [link] = await (c as any).createBigQueryLink({
    parent: params.parent,
    bigqueryLink: {
      project: params.project,
      dailyExportEnabled: params.dailyExportEnabled ?? true,
      streamingExportEnabled: params.streamingExportEnabled ?? false,
    },
  });
  return link;
}

export async function deleteBigQueryLink(name: string): Promise<void> {
  const c = getClient();
  await (c as any).deleteBigQueryLink({ name });
}
