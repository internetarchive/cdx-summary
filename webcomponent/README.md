# CDX Summary Web Component

Assuming that a CDX Summary JSON file is generated from CDX files or WARC collections using the `cdxsummary` [CLI tool](https://github.com/internetarchive/cdx-summary), use the following Web Component to render it as an interactive HTML markup.

```html
<cdx-summary src="CDX_SUMMARY_JSON_URL"></cdx-summary>
```

Alternatively, render a summary from a `web` collection/item of Internet Archive's Petabox, if a corresponding summary file is generated already.

```html
<cdx-summary item="PETABOX_ITEM_OR_COLLECTION_ID"></cdx-summary>
```

By default, sample capture playback links (i.e., memento URIs or URI-Ms) point to `https://web.archive.org/web/`, but this can be customized by specifying the `playback` attribute.
To control the maximum number of thumbnails of random sample captures (rendered by embedding them in iframes), specify a positive integer in the `thumbs` attribute.
The code below illustrates the usage of these attributes.

```html
<cdx-summary src="https://example.org/files/covid-collection-cdx.summary.json"
             thumbs="10"
             playback="https://archive.example.com/memento/">
</cdx-summary>
```
