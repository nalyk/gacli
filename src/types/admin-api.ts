export interface GA4Account {
  name: string;
  displayName: string;
  createTime?: string;
  updateTime?: string;
  regionCode?: string;
}

export interface GA4Property {
  name: string;
  displayName: string;
  propertyType?: string;
  createTime?: string;
  updateTime?: string;
  parent?: string;
  timeZone?: string;
  currencyCode?: string;
  industryCategory?: string;
  serviceLevel?: string;
}

export interface CreatePropertyParams {
  displayName: string;
  parent: string;
  timeZone?: string;
  currencyCode?: string;
  industryCategory?: string;
}

export interface UpdatePropertyParams {
  name: string;
  displayName?: string;
  timeZone?: string;
  currencyCode?: string;
  industryCategory?: string;
}

export interface GA4DataStream {
  name: string;
  type: 'WEB_DATA_STREAM' | 'ANDROID_APP_DATA_STREAM' | 'IOS_APP_DATA_STREAM';
  displayName: string;
  createTime?: string;
  updateTime?: string;
  webStreamData?: {
    measurementId: string;
    defaultUri: string;
  };
  androidAppStreamData?: {
    firebaseAppId: string;
    packageName: string;
  };
  iosAppStreamData?: {
    firebaseAppId: string;
    bundleId: string;
  };
}

export interface CreateDataStreamParams {
  parent: string;
  type: 'WEB_DATA_STREAM' | 'ANDROID_APP_DATA_STREAM' | 'IOS_APP_DATA_STREAM';
  displayName: string;
  webStreamData?: { defaultUri: string };
  androidAppStreamData?: { packageName: string };
  iosAppStreamData?: { bundleId: string };
}

export interface UpdateDataStreamParams {
  name: string;
  displayName?: string;
}

export interface GA4CustomDimension {
  name: string;
  parameterName: string;
  displayName: string;
  description?: string;
  scope: 'EVENT' | 'USER' | 'ITEM';
  disallowAdsPersonalization?: boolean;
}

export interface CreateCustomDimensionParams {
  parent: string;
  parameterName: string;
  displayName: string;
  description?: string;
  scope: 'EVENT' | 'USER' | 'ITEM';
  disallowAdsPersonalization?: boolean;
}

export interface UpdateCustomDimensionParams {
  name: string;
  displayName?: string;
  description?: string;
  disallowAdsPersonalization?: boolean;
}

export interface GA4CustomMetric {
  name: string;
  parameterName: string;
  displayName: string;
  description?: string;
  scope: 'EVENT';
  measurementUnit: 'STANDARD' | 'CURRENCY' | 'FEET' | 'METERS' | 'KILOMETERS' | 'MILES' | 'MILLISECONDS' | 'SECONDS' | 'MINUTES' | 'HOURS';
  restrictedMetricType?: string[];
}

export interface CreateCustomMetricParams {
  parent: string;
  parameterName: string;
  displayName: string;
  description?: string;
  scope: 'EVENT';
  measurementUnit: string;
  restrictedMetricType?: string[];
}

export interface UpdateCustomMetricParams {
  name: string;
  displayName?: string;
  description?: string;
  measurementUnit?: string;
  restrictedMetricType?: string[];
}

export interface GA4KeyEvent {
  name: string;
  eventName: string;
  createTime?: string;
  deletable?: boolean;
  custom?: boolean;
  countingMethod: 'ONCE_PER_EVENT' | 'ONCE_PER_SESSION';
  defaultValue?: {
    numericValue?: number;
    currencyCode?: string;
  };
}

export interface CreateKeyEventParams {
  parent: string;
  eventName: string;
  countingMethod: 'ONCE_PER_EVENT' | 'ONCE_PER_SESSION';
  defaultValue?: {
    numericValue?: number;
    currencyCode?: string;
  };
}

export interface UpdateKeyEventParams {
  name: string;
  countingMethod?: 'ONCE_PER_EVENT' | 'ONCE_PER_SESSION';
  defaultValue?: {
    numericValue?: number;
    currencyCode?: string;
  };
}

export interface GA4Audience {
  name: string;
  displayName: string;
  description?: string;
  membershipDurationDays?: number;
  adsPersonalizationEnabled?: boolean;
  filterClauses?: unknown[];
}

export interface CreateAudienceParams {
  parent: string;
  displayName: string;
  description?: string;
  membershipDurationDays: number;
  filterClauses: unknown[];
  adsPersonalizationEnabled?: boolean;
}

export interface UpdateAudienceParams {
  name: string;
  displayName?: string;
  description?: string;
  adsPersonalizationEnabled?: boolean;
}

export interface GA4AccessBinding {
  name: string;
  user?: string;
  roles: string[];
}

export interface CreateAccessBindingParams {
  parent: string;
  user: string;
  roles: string[];
}

export interface UpdateAccessBindingParams {
  name: string;
  roles: string[];
}

export interface GA4FirebaseLink {
  name: string;
  project: string;
  createTime?: string;
}

export interface CreateFirebaseLinkParams {
  parent: string;
  project: string;
}

export interface GA4GoogleAdsLink {
  name: string;
  customerId: string;
  canManageClients?: boolean;
  adsPersonalizationEnabled?: boolean;
  createTime?: string;
  updateTime?: string;
}

export interface CreateGoogleAdsLinkParams {
  parent: string;
  customerId: string;
  adsPersonalizationEnabled?: boolean;
}

export interface UpdateGoogleAdsLinkParams {
  name: string;
  adsPersonalizationEnabled?: boolean;
}

export interface GA4BigQueryLink {
  name: string;
  project: string;
  createTime?: string;
  dailyExportEnabled?: boolean;
  streamingExportEnabled?: boolean;
  intradayExportEnabled?: boolean;
  includeAdvertisingId?: boolean;
  exportStreams?: string[];
  excludedEvents?: string[];
}

export interface CreateBigQueryLinkParams {
  parent: string;
  project: string;
  dailyExportEnabled?: boolean;
  streamingExportEnabled?: boolean;
}
