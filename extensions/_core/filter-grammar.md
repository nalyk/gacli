# Filter grammar

`--dimension-filter` and `--metric-filter` accept a shorthand string of the
form `field<op>value`. They are variadic, so repeat the flag for AND
combination.

## The 8 operators

| Operator | Meaning | Dim/metric | Example |
|---|---|---|---|
| `==` | Exact match (string equality) | dim | `country==US` |
| `!=` | Not equal | dim | `country!=US` |
| `=~` | Regex contains/matches | dim | `pagePath=~^/blog/` |
| `!~` | Regex does NOT match | dim | `pagePath!~/admin/` |
| `>` | Greater than (numeric) | metric | `sessions>100` |
| `<` | Less than | metric | `sessions<10` |
| `>=` | Greater or equal | metric | `sessions>=50` |
| `<=` | Less or equal | metric | `bounceRate<=0.5` |

## Combining filters

Multiple filters are **always combined with AND**. There is no built-in OR or
NOT in the shorthand.

```bash
# AND semantics: country == US AND device == mobile
gacli report run -m sessions -d country,deviceCategory \
  --dimension-filter country==US --dimension-filter deviceCategory==mobile
```

For OR / NOT / nested groups, fall back to the JSON form (see below).

## JSON form for complex filters

When AND-only is too restrictive, build the GA4 `FilterExpression` JSON by
hand and pass via `--filter-clauses` (admin audience operations) or by writing
a `report batch` request file:

```json
{
  "andGroup": {
    "expressions": [
      { "filter": { "fieldName": "country", "stringFilter": { "value": "US" } } },
      {
        "orGroup": {
          "expressions": [
            { "filter": { "fieldName": "deviceCategory", "stringFilter": { "value": "mobile" } } },
            { "filter": { "fieldName": "deviceCategory", "stringFilter": { "value": "tablet" } } }
          ]
        }
      }
    ]
  }
}
```

## Common gotchas

- **Regex operators** (`=~`, `!~`) match anywhere in the string by default.
  Anchor with `^` and `$` for full-match: `pagePath=~^/blog/$`.
- **Case-sensitive** — `country==us` will NOT match `US`. Use a regex with
  flags via the JSON form if you need case-insensitive matching.
- **Numeric operators** (`>`, `>=`, `<`, `<=`) ONLY work on metrics, not
  dimensions.
- **Variadic syntax**: `--dimension-filter A==X --dimension-filter B==Y` works.
  `--dimension-filter A==X B==Y` does NOT (Commander parses the second as a
  positional argument).
- **JSON quoting in shell**: when you switch to the JSON form, single-quote
  the entire JSON: `--filter-clauses '[{...}]'`. Double-quotes require
  escaping inner quotes.

Source: `src/utils/filter-builder.ts`.
