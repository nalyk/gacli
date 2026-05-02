# gacli worked examples (Qwen-conventional)

12 high-leverage workflows. Each is a self-contained recipe the agent can
run end-to-end.

## 1. Daily traffic overview, last 7 days
```bash
gacli report run -m sessions,activeUsers,screenPageViews -d date \
  --order-by dimension:date:asc -f json
```

## 2. Top 10 landing pages
```bash
gacli report run -m sessions,engagementRate -d landingPage \
  --order-by metric:sessions:desc --limit 10 -f table
```

## 3. Compare last 7 days vs prior 7 days

Create `requests.json`:
```json
[
  { "metrics": [{"name":"sessions"}], "dimensions": [{"name":"date"}],
    "dateRanges": [{"startDate":"7daysAgo","endDate":"today","name":"current"}] },
  { "metrics": [{"name":"sessions"}], "dimensions": [{"name":"date"}],
    "dateRanges": [{"startDate":"14daysAgo","endDate":"8daysAgo","name":"prior"}] }
]
```
```bash
gacli report batch --requests requests.json -f ndjson | jq .
```

## 4. Conversion funnel (3 steps)
```bash
gacli report funnel --steps '[
  {"name":"View","filterExpression":{"filter":{"fieldName":"eventName","stringFilter":{"value":"view_item"}}}},
  {"name":"Add","filterExpression":{"filter":{"fieldName":"eventName","stringFilter":{"value":"add_to_cart"}}}},
  {"name":"Buy","filterExpression":{"filter":{"fieldName":"eventName","stringFilter":{"value":"purchase"}}}}
]' --start-date 30daysAgo -f json
```

## 5. Real-time pulse (last 30 min)
```bash
gacli report realtime -m activeUsers -d country,sessionSource --limit 20 -f table
```

## 6. Property audit
```bash
gacli admin custom-dimensions list -f table
gacli admin custom-metrics    list -f table
gacli admin key-events         list -f table
gacli admin datastreams        list -f table
gacli admin audiences          list -f table
```

## 7. Set up a fresh property
```bash
gacli admin properties create --account <accountId> \
  --display-name "My Site" --time-zone America/New_York --currency-code USD
gacli admin datastreams create -p <newProp> \
  --type WEB_DATA_STREAM --display-name "Production" --uri https://example.com
gacli admin bigquery-links create -p <newProp> \
  --project my-gcp-project --daily-export-enabled true
gacli admin custom-dimensions create -p <newProp> \
  --parameter-name plan_tier --display-name "Plan Tier" --scope EVENT
gacli admin key-events create -p <newProp> \
  --event-name purchase --counting-method ONCE_PER_EVENT
```

## 8. Audience export → query members
```bash
gacli audience export create --audience properties/<P>/audiences/<aid>
gacli audience export list -f json | jq '.[] | select(.state=="ACTIVE")'
gacli audience export query --name <export-resource-name> --limit 1000 -f csv > members.csv
```

## 9. Pivot: source × medium × device
```bash
gacli report pivot -m sessions -d sessionSource,sessionMedium,deviceCategory \
  --pivots '[{"fieldNames":["deviceCategory"],"limit":3},{"fieldNames":["sessionSource","sessionMedium"],"limit":10}]' \
  -f table
```

## 10. Weekly cohort retention, last 4 weeks
```bash
gacli report cohort -m activeUsers,sessions --cohorts '[
  {"name":"w1","dimension":"firstSessionDate","dateRange":{"startDate":"28daysAgo","endDate":"22daysAgo"}},
  {"name":"w2","dimension":"firstSessionDate","dateRange":{"startDate":"21daysAgo","endDate":"15daysAgo"}},
  {"name":"w3","dimension":"firstSessionDate","dateRange":{"startDate":"14daysAgo","endDate":"8daysAgo"}},
  {"name":"w4","dimension":"firstSessionDate","dateRange":{"startDate":"7daysAgo","endDate":"today"}}
]' --cohort-granularity WEEKLY --end-offset 4 -f json
```

## 11. "Why is bounce rate up?" diagnostic
```bash
# Confirm regression
gacli report run -m bounceRate -d date --start-date 30daysAgo \
  --order-by dimension:date:asc -f json

# Slice by likely culprits
gacli report run -m sessions,bounceRate -d sessionSource \
  --start-date 7daysAgo --order-by metric:sessions:desc --limit 10
gacli report run -m sessions,bounceRate -d landingPage \
  --start-date 7daysAgo --order-by metric:sessions:desc --limit 10
gacli report run -m sessions,bounceRate -d deviceCategory --start-date 7daysAgo
```

## 12. Batch metadata pull
```bash
gacli metadata get --type all -f json > metadata.json
gacli admin properties get -f json > property.json
gacli admin datastreams list -f json > streams.json
gacli admin custom-dimensions list -f json > customdims.json
```
