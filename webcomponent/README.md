# CDX Summary Web Component

Assuming that a CDX Summary JSON file is generated from CDX files or WARC collections using the `cdxsummary` [CLI tool](https://github.com/internetarchive/cdx-summary), use the following Web Component to render it as an interactive HTML markup.

```html
<cdx-summary src="CDX_SUMMARY_JSON_URL"></cdx-summary>
```

Alternatively, render a summary from a `web` collection/item of Internet Archive's Petabox, if a corresponding summary file is generated already.

```html
<cdx-summary item="PETABOX_ITEM_OR_COLLECTION_ID"></cdx-summary>
```
