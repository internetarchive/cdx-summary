# CDX Summary Web Component

Assuming that a CDX Summary JSON file is generated from CDX files or WARC collections using the `cdxsummary` [CLI tool](https://github.com/internetarchive/cdx-summary), use the following Web Component to render it as an interactive HTML markup.

```html
<cdx-summary src="CDX_SUMMARY_JSON_URL"></cdx-summary>
```

Alternatively, render a summary from a `web` collection/item of Internet Archive's Petabox, if a corresponding summary file is generated already.

```html
<cdx-summary item="PETABOX_ITEM_OR_COLLECTION_ID"></cdx-summary>
```

One of the `src` and `item` attributes is mandatory for the element to render.

By default, sample capture playback links (i.e., memento URIs or URI-Ms) point to `https://web.archive.org/web/`, but this can be customized by specifying the `playback` attribute.
To control the maximum number of thumbnails of random sample captures (rendered by embedding them in iframes), specify a positive integer in the `thumbs` attribute.
The list of random sample capture playback URIs are hidden by default, but can be expanded by setting the `samples-drawer` attribute to `open`.
The element accepts a `name` attribute, which defaults to the name of the summary file (without extensions).
A `type` attribute can be used to customize textual descriptions with a value of `collection`, `item`, or `CDX` (defaults to `CDX`).
A `report` attribute points to a comprehensive version of the summary file, which is derived from the `item` attribute for Petabox items/collections, unless specified explicitly.
The code below illustrates the usage of these attributes.

```html
<cdx-summary src="https://example.org/files/covid-collection-cdx.summary.json"
             report="https://example.org/files/covid-collection-cdx.report.json.gz"
             type="collection"
             name="COVID-19 Collection"
             thumbs="10"
             playback="https://archive.example.com/memento/"
             samples-drawer="open">
</cdx-summary>
```
