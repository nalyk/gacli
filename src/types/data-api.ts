export interface DateRange {
  startDate: string;
  endDate: string;
  name?: string;
}

export interface Dimension {
  name: string;
}

export interface Metric {
  name: string;
}

export interface OrderBy {
  dimension?: { dimensionName: string; orderType?: string };
  metric?: { metricName: string };
  desc?: boolean;
}

export interface FilterExpression {
  andGroup?: { expressions: FilterExpression[] };
  orGroup?: { expressions: FilterExpression[] };
  notExpression?: FilterExpression;
  filter?: {
    fieldName: string;
    stringFilter?: {
      matchType: 'EXACT' | 'BEGINS_WITH' | 'ENDS_WITH' | 'CONTAINS' | 'FULL_REGEXP' | 'PARTIAL_REGEXP';
      value: string;
      caseSensitive?: boolean;
    };
    inListFilter?: {
      values: string[];
      caseSensitive?: boolean;
    };
    numericFilter?: {
      operation: 'EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL';
      value: { int64Value?: string; doubleValue?: number };
    };
    betweenFilter?: {
      fromValue: { int64Value?: string; doubleValue?: number };
      toValue: { int64Value?: string; doubleValue?: number };
    };
  };
}

export interface RunReportParams {
  property: string;
  dateRanges: DateRange[];
  dimensions?: Dimension[];
  metrics: Metric[];
  dimensionFilter?: FilterExpression;
  metricFilter?: FilterExpression;
  orderBys?: OrderBy[];
  limit?: number;
  offset?: number;
  keepEmptyRows?: boolean;
  returnPropertyQuota?: boolean;
}

export interface PivotDefinition {
  fieldNames: string[];
  orderBys?: OrderBy[];
  offset?: number;
  limit: number;
  metricAggregations?: ('TOTAL' | 'MINIMUM' | 'MAXIMUM' | 'COUNT')[];
}

export interface RunPivotReportParams {
  property: string;
  dateRanges: DateRange[];
  dimensions: Dimension[];
  metrics: Metric[];
  pivots: PivotDefinition[];
  dimensionFilter?: FilterExpression;
  metricFilter?: FilterExpression;
  keepEmptyRows?: boolean;
  returnPropertyQuota?: boolean;
}

export interface MinuteRange {
  name?: string;
  startMinutesAgo: number;
  endMinutesAgo: number;
}

export interface RunRealtimeReportParams {
  property: string;
  dimensions?: Dimension[];
  metrics: Metric[];
  dimensionFilter?: FilterExpression;
  metricFilter?: FilterExpression;
  orderBys?: OrderBy[];
  limit?: number;
  minuteRanges?: MinuteRange[];
}

export interface FunnelStep {
  name: string;
  isDirectlyFollowedBy?: boolean;
  filterExpression?: FunnelFilterExpression;
  withinDurationFromPriorStep?: string;
}

export interface FunnelFilterExpression {
  andGroup?: { expressions: FunnelFilterExpression[] };
  orGroup?: { expressions: FunnelFilterExpression[] };
  notExpression?: FunnelFilterExpression;
  funnelFieldFilter?: {
    fieldName: string;
    stringFilter?: {
      matchType: 'EXACT' | 'BEGINS_WITH' | 'ENDS_WITH' | 'CONTAINS' | 'FULL_REGEXP' | 'PARTIAL_REGEXP';
      value: string;
      caseSensitive?: boolean;
    };
    inListFilter?: {
      values: string[];
      caseSensitive?: boolean;
    };
    numericFilter?: {
      operation: 'EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL';
      value: { int64Value?: string; doubleValue?: number };
    };
    betweenFilter?: {
      fromValue: { int64Value?: string; doubleValue?: number };
      toValue: { int64Value?: string; doubleValue?: number };
    };
  };
  funnelEventFilter?: {
    eventName: string;
    funnelParameterFilterExpression?: FunnelFilterExpression;
  };
}

export interface RunFunnelReportParams {
  property: string;
  dateRanges?: DateRange[];
  funnel: {
    isOpenFunnel?: boolean;
    steps: FunnelStep[];
  };
  funnelBreakdown?: {
    breakdownDimension: Dimension;
    limit?: number;
  };
}

export interface CohortSpec {
  name: string;
  dimension: string;
  dateRange: DateRange;
}

export interface RunCohortReportParams {
  property: string;
  cohortSpec: {
    cohorts: CohortSpec[];
    cohortsRange: {
      granularity: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      startOffset?: number;
      endOffset: number;
    };
  };
  metrics: Metric[];
  dimensions?: Dimension[];
  accumulate?: boolean;
}

export interface BatchRunReportsRequest {
  requests: RunReportParams[];
}

export interface BatchRunPivotReportsRequest {
  requests: RunPivotReportParams[];
}
