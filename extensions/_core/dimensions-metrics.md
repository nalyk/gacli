# GA4 dimensions & metrics cheatsheet

The most-used dimensions and metrics for `gacli report run`. **Always use API
names** (camelCase) on the CLI — UI labels won't work.

For the full catalog at runtime, run `gacli metadata get -p <id>`. For
combination validity, run `gacli metadata check-compatibility -m <m...> -d <d...>`
before assembling exotic combos.

## Top-20 metrics

| API name | Meaning | Notes |
|---|---|---|
| `activeUsers` | Distinct active users in the date range | Default for "users" |
| `newUsers` | Users with their first session in the range | Acquisition KPI |
| `totalUsers` | All users with any activity (incl. recurring) | Distinct from `activeUsers` |
| `sessions` | Distinct sessions | Default for "sessions" |
| `engagedSessions` | Sessions ≥ 10s OR with conversion OR ≥ 2 page-views | GA4's quality signal |
| `engagementRate` | engagedSessions / sessions | 0..1 |
| `bounceRate` | 1 − engagementRate | Inverse |
| `screenPageViews` | All page/screen views | Replaces UA `pageviews` |
| `screenPageViewsPerSession` | Average page-views per session | Engagement signal |
| `averageSessionDuration` | Mean session length (seconds) | |
| `userEngagementDuration` | Total engaged time (seconds) | |
| `eventCount` | Total events fired | |
| `eventCountPerUser` | eventCount / activeUsers | |
| `conversions` | Total key-event firings | Was "goal completions" |
| `totalRevenue` | Sum of all monetary events | |
| `purchaseRevenue` | Sum of `purchase` event values | E-commerce KPI |
| `transactions` | Count of `purchase` events | E-commerce |
| `averagePurchaseRevenue` | totalRevenue / transactions | |
| `cartToViewRate` | add_to_cart / view_item | E-commerce funnel |
| `purchaseToViewRate` | purchase / view_item | E-commerce funnel |

## Top-20 dimensions

| API name | Scope | Meaning |
|---|---|---|
| `date` | event | YYYYMMDD; default time dimension |
| `dateHour` | event | YYYYMMDDHH; hourly |
| `dateHourMinute` | event | YYYYMMDDHHMM; minute precision |
| `country` | session | ISO country |
| `region` | session | Sub-country region |
| `city` | session | |
| `deviceCategory` | session | desktop / mobile / tablet |
| `operatingSystem` | session | Android / iOS / Windows / macOS / Linux |
| `browser` | session | |
| `language` | session | Browser/device locale |
| `sessionSource` | session | Source attribution at session start |
| `sessionMedium` | session | organic / cpc / referral / etc. |
| `sessionCampaignName` | session | Campaign label |
| `sessionDefaultChannelGroup` | session | Direct, Organic Search, Paid Search, Social, Email, etc. |
| `firstUserSource` | user | Source on user's first session (acquisition) |
| `firstUserMedium` | user | Medium on user's first session |
| `pagePath` | event | Path of the page (no domain, no query) |
| `pageTitle` | event | `<title>` of the page |
| `landingPage` | session | First page of the session |
| `eventName` | event | Event name (e.g. `page_view`, `purchase`) |

## Compatibility caveats

- **Scope mixing**: combining a `user`-scope dimension (e.g. `firstUserSource`)
  with a `session`-scope metric (e.g. `engagementRate`) often returns sparse
  data. Run `gacli metadata check-compatibility` first.
- **Cardinality**: dimensions with very high cardinality (`pagePath`,
  `pageTitle`, `clientId`) can produce large result sets. Apply
  `--dimension-filter` and/or `--limit`.
- **`date` with hourly metrics**: `date` is daily-aggregated; pair with
  `dateHour` only when you actually want hourly slices.
- **Custom dimensions**: API name is `customEvent:<param_name>` (event scope)
  or `customUser:<param_name>` (user scope). Verify exact name with
  `gacli admin custom-dimensions list`.
- **Custom metrics**: API name is `customEvent:<param_name>`. Verify with
  `gacli admin custom-metrics list`.

## Format/format pairings (rules of thumb)

- **Trend over time**: `-d date` + 1-2 numeric metrics + `-f chart` for a
  terminal sparkline, or `-f json` for downstream charting.
- **Top-N report**: 1 dimension + 1-2 metrics + `--order-by metric:X:desc
  --limit 10`.
- **Cross-tab**: `gacli report pivot` with `--pivots '[{"fieldNames":["X"]}]'`.
- **Audit**: `-d eventName` + `-m eventCount` to see what events are firing.
