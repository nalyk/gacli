# 12 high-leverage gacli recipes

Each recipe: question → invocation → what to look for. Replace `<P>` with the
GA4 property ID. All examples assume `-f json` for parsing or `-f table` for
display, as appropriate.

## 1. Daily traffic overview, last 7 days

```bash
gacli report run -p <P> \
  -m sessions,activeUsers,screenPageViews \
  -d date \
  --order-by dimension:date:asc \
  -f json
```
Look for the trend line. Spike or trough days flag for follow-up.

## 2. Top 10 landing pages by sessions, last 7 days

```bash
gacli report run -p <P> \
  -m sessions,engagementRate \
  -d landingPage \
  --order-by metric:sessions:desc \
  --limit 10 \
  -f table
```
Pages with high sessions + low engagementRate = optimization candidates.

## 3. Compare last 7 days vs prior 7 days

Build a `report batch` request file:

```json
[
  { "metrics": [{"name": "sessions"}, {"name": "activeUsers"}],
    "dimensions": [{"name": "date"}],
    "dateRanges": [{ "startDate": "7daysAgo", "endDate": "today", "name": "current" }] },
  { "metrics": [{"name": "sessions"}, {"name": "activeUsers"}],
    "dimensions": [{"name": "date"}],
    "dateRanges": [{ "startDate": "14daysAgo", "endDate": "8daysAgo", "name": "prior" }] }
]
```
```bash
gacli report batch -p <P> --requests requests.json -f ndjson | jq .
```

## 4. Conversion funnel (3 steps)

```bash
gacli report funnel -p <P> --steps '[
  {"name":"View product","filterExpression":{"filter":{"fieldName":"eventName","stringFilter":{"value":"view_item"}}}},
  {"name":"Add to cart","filterExpression":{"filter":{"fieldName":"eventName","stringFilter":{"value":"add_to_cart"}}}},
  {"name":"Purchase","filterExpression":{"filter":{"fieldName":"eventName","stringFilter":{"value":"purchase"}}}}
]' --start-date 30daysAgo -f json
```
Drop-offs between steps surface the weakest link in the conversion path.

## 5. Real-time pulse (last 30 min) by country and source

```bash
gacli report realtime -p <P> \
  -m activeUsers \
  -d country,sessionSource \
  --limit 20 -f table
```
Date flags ignored — this is fixed at "now minus 30 minutes."

## 6. Property audit: custom dims, metrics, key events, datastreams

```bash
echo "## Custom dimensions" && gacli admin custom-dimensions list -p <P> -f table
echo "## Custom metrics"    && gacli admin custom-metrics    list -p <P> -f table
echo "## Key events"        && gacli admin key-events         list -p <P> -f table
echo "## Datastreams"       && gacli admin datastreams        list -p <P> -f table
echo "## Audiences"         && gacli admin audiences          list -p <P> -f table
```
Snapshot what's configured. Useful before any change.

## 7. Set up a fresh property

```bash
# 1. Create the property
gacli admin properties create \
  --account <accountId> \
  --display-name "My New Site" \
  --time-zone America/New_York \
  --currency-code USD

# 2. Create a Web data stream
gacli admin datastreams create -p <newPropertyId> \
  --type WEB_DATA_STREAM \
  --display-name "Production website" \
  --uri https://example.com

# 3. Link BigQuery for raw event export
gacli admin bigquery-links create -p <newPropertyId> \
  --project my-gcp-project \
  --daily-export-enabled true

# 4. Define a custom dimension
gacli admin custom-dimensions create -p <newPropertyId> \
  --parameter-name plan_tier \
  --display-name "Plan Tier" \
  --scope EVENT

# 5. Mark a key event
gacli admin key-events create -p <newPropertyId> \
  --event-name purchase \
  --counting-method ONCE_PER_EVENT
```

## 8. Audience export → query members

```bash
# Trigger export
gacli audience export create -p <P> --audience properties/<P>/audiences/<aid>
# Returns: operation name. Wait, then list:
gacli audience export list -p <P> -f json | jq '.[] | select(.state=="ACTIVE")'
# Once active, fetch the rows:
gacli audience export query -p <P> --name <export-resource-name> --limit 1000 -f csv > members.csv
```

## 9. Pivot: source × medium × device traffic matrix

```bash
gacli report pivot -p <P> \
  -m sessions \
  -d sessionSource,sessionMedium,deviceCategory \
  --pivots '[{"fieldNames":["deviceCategory"],"limit":3},{"fieldNames":["sessionSource","sessionMedium"],"limit":10}]' \
  -f table
```

## 10. Weekly cohort retention, last 4 weeks

```bash
gacli report cohort -p <P> \
  -m activeUsers,sessions \
  --cohorts '[
    {"name":"w1","dimension":"firstSessionDate","dateRange":{"startDate":"28daysAgo","endDate":"22daysAgo"}},
    {"name":"w2","dimension":"firstSessionDate","dateRange":{"startDate":"21daysAgo","endDate":"15daysAgo"}},
    {"name":"w3","dimension":"firstSessionDate","dateRange":{"startDate":"14daysAgo","endDate":"8daysAgo"}},
    {"name":"w4","dimension":"firstSessionDate","dateRange":{"startDate":"7daysAgo","endDate":"today"}}
  ]' \
  --cohort-granularity WEEKLY --end-offset 4 -f json
```

## 11. "Why is bounce rate up?" diagnostic

```bash
# Step 1: confirm the regression
gacli report run -p <P> -m bounceRate -d date \
  --start-date 30daysAgo --order-by dimension:date:asc -f json

# Step 2: slice by likely culprits
gacli report run -p <P> -m sessions,bounceRate -d sessionSource \
  --start-date 7daysAgo --order-by metric:sessions:desc --limit 10

gacli report run -p <P> -m sessions,bounceRate -d landingPage \
  --start-date 7daysAgo --order-by metric:sessions:desc --limit 10

gacli report run -p <P> -m sessions,bounceRate -d deviceCategory \
  --start-date 7daysAgo
```
The dimension where bounce diverges most from the property baseline is the
likely culprit.

## 12. Batch metadata pull for a client report

```bash
gacli metadata get -p <P> --type all -f json > metadata.json
gacli admin properties get -p <P> -f json > property.json
gacli admin datastreams list -p <P> -f json > streams.json
gacli admin custom-dimensions list -p <P> -f json > customdims.json
```
Stash for a later doc-generation step.
