export class CDXSummary extends HTMLElement {
  PETABOX = 'https://archive.org/download/';
  WAYBACK = 'https://web.archive.org/web/';
  CLIREPO = 'https://github.com/internetarchive/cdx-summary';
  data = {};

  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'closed'});
  }

  toFs(s) {
    let i = Math.floor(Math.log(s)/Math.log(1024));
    return `${Number((s/Math.pow(1024, i)).toFixed(2))} ${['B', 'kB', 'MB', 'GB', 'TB'][i]}`;
  }

  toDate(dt) {
    return `${dt.substring(0, 4)}-${dt.substring(4, 6)}-${dt.substring(6, 8)}`;
  }

  toMonth(m) {
    return (new Date(1970, m-1, 15)).toLocaleDateString('default', {month: 'short'});
  }

  toNum(n) {
    return new Intl.NumberFormat().format(n);
  }

  toPerc(n) {
    return `${(n*100/this.data.captures).toFixed(2)}%`;
  }

  numCell(n) {
    return `<td title="${this.toPerc(n)}">${this.toNum(n)}</td>`;
  }

  numSum(nums) {
    return nums.reduce((s, v) => s + v, 0);
  }

  urim(dt, urir, mod='') {
    return `${this.playback}/${dt}${mod}/${urir}`;
  }

  overviewTable() {
    return `
<table>
  <tbody>
    <tr>
      <th scope="row">Total Captures in CDX</th>
      <td>${this.toNum(this.data.captures)}</td>
    </tr>
    <tr>
      <th scope="row">Consecutive Unique URIs</th>
      <td>${this.toNum(this.data.urls)}</td>
    </tr>
    <tr>
      <th scope="row">Consecutive Unique Hosts</th>
      <td>${this.toNum(this.data.hosts)}</td>
    </tr>
    <tr>
      <th scope="row">Total WARC Records Size</th>
      <td>${this.toFs(this.data.bytes)}</td>
    </tr>
    <tr>
      <th scope="row">First Capture Date</th>
      <td>${this.toDate(this.data.first)}</td>
    </tr>
    <tr>
      <th scope="row">Last Capture Date</th>
      <td>${this.toDate(this.data.last)}</td>
    </tr>
  </tbody>
</table>
`;
  }

  gridTable(obj, group='', cols=[], format=c=>c) {
    if (!cols.length) {
      cols = Object.keys(Object.values(obj)[0]);
    }
    const colSum = cols.reduce((a, k) => {a[k] = 0; return a}, {});
    return `
<table>
  <thead>
    <tr>
      <th scope="col">${group}</th>
      ${cols.map(c => `<th scope="col">${format(c)}</th>`).join('\n')}
      <th scope="col">TOTAL</th>
    </tr>
  </thead>
  <tbody>
  ${Object.entries(obj).map(o => {
    return `
    <tr>
      <th scope="row">${o[0]}</th>
      ${cols.map(c => {
        colSum[c] += o[1][c];
        return this.numCell(o[1][c]);
      }).join('\n')}
      ${this.numCell(this.numSum(Object.values(o[1])))}
    </tr>`
  }).join('\n')}
  </tbody>
  ${Object.keys(obj).length > 1 && `
  <tfoot>
    <tr>
      <th scope="col">TOTAL</th>
      ${cols.map(c => this.numCell(colSum[c])).join('\n')}
      ${this.numCell(this.data.captures)}
    </tr>
  </tfoot>`}
</table>
`;
  }

  topHostsTable() {
    const otherHostsCount = this.data.hosts - Object.keys(this.data.tophosts).length;
    const otherHostsTotal = this.data.captures - this.numSum(Object.values(this.data.tophosts));
    return `
<table>
  <thead>
    <tr>
      <th scope="col">Host</th>
      <th scope="col">Captures</th>
    </tr>
  </thead>
  <tbody>
  ${Object.entries(this.data.tophosts).map(h => {
    return `
    <tr>
      <th scope="row">${h[0]}</th>
      ${this.numCell(h[1])}
    </tr>`
  }).join('\n')}
  </tbody>
  ${otherHostsCount > 0 && `
  <tfoot>
    <tr>
      <th scope="row">OTHERS (${this.toNum(otherHostsCount)} Hosts)</th>
      ${this.numCell(otherHostsTotal)}
    </tr>
  </tfoot>`}
</table>
`;
  }

  sampleCapturesList() {
    return `
<details class="samples">
<summary data-open="Hide Sample URIs" data-close="Show ${this.data.samples.length} Random Sample URIs"></summary>
<ul>
${this.data.samples.map(s => s.concat(s[1].replace(/^(https?:\/\/)?(www\.)?/i, ''))).sort((a, b) => a[2].length - b[2].length).map(s => `<li><a href="${this.urim(s[0], s[1])}">${s[2]}</a></li>`).join('\n')}
</ul>
</details>
`;
  }

  sampleCards() {
    let s = this.data.samples;
    const ridx = new Set();
    while (ridx.size < Math.min(this.thumbs, s.length)) {
      ridx.add(Math.floor(Math.random()*s.length));
    }
    return `
<div class="sample-thumbs">
${[...ridx].map(i => `
  <div class="thumb-container">
    <div class="thumb">
      <a href="${this.urim(s[i][0], s[i][1])}">${s[i][1]}</a>
      <iframe src="${this.urim(s[i][0], s[i][1], 'if_')}" sandbox="allow-same-origin allow-scripts" scrolling="no" frameborder="0" onload="this.style.backgroundColor = 'white'"></iframe>
    </div>
  </div>
`).join('\n')}
</div>
`;
  }

  renderSummary() {
    const container = this.shadow.getElementById('container');
    if (this.data['msg']) {
      container.innerHTML = `<p class="msg">${this.data['msg']}</p>`;
      return;
    }

    container.innerHTML = `
<p>
The summary below is based on the <a href="${this.src}">Item/Collection Summary JSON</a> file.
A more comprehensive <a href="${this.src.replace(/\.summary\.json$/, '.report.json.gz')}">Item/Collection Report</a> file is available for detailed analysis and research.
</p>

<p class="info">
Hover over on numeric cells to see the percentage value in the tooltip w.r.t. the total number of captures.
Insignificant values might be reported as <code>0.00%</code>.
</p>

<h2>CDX Overview</h2>
<p>
This overview is based on the sorted unique capture index (CDX) file of all the WARC files in the item/collection.
The <code>Total WARC Records Size</code> value is neither the combined size of the WARC files nor the sum of the sizes of the archived resources, instead, it is the sum of the sizes of the compressed WARC Response records (including their headers).
</p>
${this.overviewTable()}

<h2>MIME Type and Status Code</h2>
<p>
The matrix below shows HTTP status code groups of captures of various media types in this item/collection.
The <code>Revisit</code> records do not represent an independent media type, instead, they reflect an unchanged state of representations of resources from some of their prior observations (i.e., the same content digest for the same URI).
The <code>TOTAL</code> column shows combined counts for each media type irrespective of their HTTP status code and the <code>TOTAL</code> row (displayed only if there are more than one media types listed) shows the combined counts of each HTTP status code group irrespective of their media types.
</p>
${this.gridTable(this.data.mimestatus, 'MIME')}

<h2>Path Segment and Query Parameter</h2>
<p>
The matrix below shows the number of path segments and the number of query parameters of various URIs in this item/collection.
For example, the cell <code>P0</code> and <code>Q0</code> shows the number of captures of homepages of various hosts with zero path segments and zero query parameters.
The URI <code>https://example.com/img/logo.png?width=300&height=100&screen=highres</code> has two path segments (i.e., <code>/img/logo.png</code>) and three query parameters (i.e., <code>width=300&height=100&screen=highres</code>), hence counted under the <code>P2</code> and <code>Q3</code> cell.
The <code>TOTAL</code> column shows combined counts for URIs with a specific number of path segments irrespective of their number of query parameters and the <code>TOTAL</code> row (displayed only if there are URIs with a varying number of path segments) shows the combined counts for URIs with a specific number of query parameters irrespective of their number of path segments.
</p>
${this.gridTable(this.data.pathquery, 'Path')}

<h2>Year and Month</h2>
<p>
The matrix below shows the number of captures of this item/collection observed in different calendar years and months.
The <code>TOTAL</code> column shows combined counts for corresponding years and the <code>TOTAL</code> row (displayed only if the captures were observed across multiple calendar years) shows the combined number of captures observed in the corresponding calendar months irrespective of their years.
</p>
${this.gridTable(this.data.yearmonth, 'Year', Object.keys(Object.values(this.data.yearmonth)[0]).sort(), this.toMonth)}

<h2>Top <i>${this.toNum(Object.keys(this.data.tophosts).length)}</i> Out of <i>${this.toNum(this.data.hosts)}</i> Hosts</h2>
<p>
The table below shows the top hosts of this item/collection based on the number of captures of URIs from each host.
The <code>OTHERS</code> row, if present, is the sum of the longtail of hosts.
</p>
${this.topHostsTable()}

<h2>Random HTML Capture Samples</h2>
${this.sampleCards()}
<p>
Below is a list of random sample of captured URIs linked to their corresponding Wayback Machine playback URIs from this item/collection.
The sample is chosen only from captures that were observed with the <code>text/html</code> media type and <code>200 OK</code> HTTP status code.
Any unexpected URIs listed below (e.g., with a <code>.png/.jpg/.pdf</code> file extension) are likely a result of the Soft-404 issue from the origin server.
</p>
${this.sampleCapturesList()}
`;
  }

  async fetchSummary(url) {
    try {
      this.data = await (await fetch(url)).json();
    } catch (e) {
      this.data['msg'] = `Summary data is not available! Use the <a href="${this.CLIREPO}">CDX Summary CLI tool</a> instead.`;
    }
    this.renderSummary();
  }

  async connectedCallback() {
    this.playback = (this.getAttribute('playback') || this.WAYBACK).replace(/\/+$/, '');
    this.thumbs = ((parseInt(this.getAttribute('thumbs'))+1) || 5)-1;
    this.src = this.getAttribute('src') || '';
    this.item = this.getAttribute('item') || '';
    if(this.item && !this.src) {
      this.src = `${this.PETABOX}${this.item}/${this.item}.summary.json`;
    }
    this.data['msg'] = this.src ? 'Loading summary...' : 'Either "src" or "item" attribute is required for the &lt;cdx-summary&gt; element!';

    this.shadow.innerHTML = `
<style>
  #container {
    padding: 5px;
    font-family: "Helvetica Neue",Helvetica,Arial,sans-serif;
  }
  table { 
    border-collapse: collapse;
  }
  tr:nth-child(even), li:nth-child(even) {
    background-color: #eee;
  }
  th, td {
    text-align: right;
    padding: 2px 2px 2px 10px;
  }
  th:nth-child(1) {
    text-align: left;
    padding: 2px 10px 2px 2px;
  }
  table, thead, tfoot {
    border-bottom: 1px solid #333;
    border-top: 1px solid #333;
  }
  thead, tfoot {
    background: #777;
    color: #eee;
  }
  ul {
    word-break: break-all;
    list-style-position: inside;
    padding-inline-start: 0;
  }
  li a {
    text-decoration: none;
  }
  .msg{
    margin: 5px;
    padding: 5px;
  }
  .msg, .info {
    font-style: italic;
  }
  .info::before {
    content: "🛈 ";
  }
  summary {
    cursor: pointer;
  }
  details {
    margin-bottom: 20px;
  }
  details.samples[open] summary::after {
    content: attr(data-open);
  }
  details.samples:not([open]) summary::after {
    content: attr(data-close);
  }
  .thumb-container {
    width: 294px;
    height: 186px;
    display: inline-block;
    overflow: hidden;
    position: relative;
  }
  .thumb {
    width: 288px;
    height: 180px;
    border: 1px solid #333;
    border-radius: 4px;
    padding: 2px;
    background-color: #fff;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 58 58' style='enable-background:new 0 0 58 58' xml:space='preserve'%3E%3Cpath fill='lightgray' d='M31 56h24V32H31v24zm2-22h9v12.586l-4.293-4.293-1.414 1.414L43 50.414l6.707-6.707-1.414-1.414L44 46.586V34h9v20H33V34zM21.569 13.569C21.569 10.498 19.071 8 16 8s-5.569 2.498-5.569 5.569c0 3.07 2.498 5.568 5.569 5.568s5.569-2.497 5.569-5.568zm-9.138 0C12.431 11.602 14.032 10 16 10s3.569 1.602 3.569 3.569-1.601 3.569-3.569 3.569-3.569-1.601-3.569-3.569zM6.25 36.661a.997.997 0 0 0 1.41.09l16.313-14.362 7.319 7.318a.999.999 0 1 0 1.414-1.414l-1.825-1.824 9.181-10.054 11.261 10.323a1 1 0 0 0 1.351-1.475l-12-11a1.002 1.002 0 0 0-1.414.063l-9.794 10.727-4.743-4.743a1.003 1.003 0 0 0-1.368-.044L6.339 35.249a1 1 0 0 0-.089 1.412z'/%3E%3Cpath fill='lightgray' d='M57 2H1a1 1 0 0 0-1 1v44a1 1 0 0 0 1 1h24a1 1 0 1 0 0-2H2V4h54v25a1 1 0 1 0 2 0V3a1 1 0 0 0-1-1z'/%3E%3C/svg%3E");
    background-position: center;
    background-repeat: no-repeat;
    background-size: 30%;
  }
  .thumb a {
    display: block;
    position: absolute;
    z-index: 2;
    inset: 0;
    color: #fff;
    background: #fff;
    opacity: 0;
  }
  .thumb iframe {
    overflow: hidden;
    position: relative;
    z-index: 1;
    width: 960px;
    height: 600px;
    transform-origin: 0 0;
    transform: scale(0.3, 0.3);
  }
</style>
<div id="container">
</div>
`;

    if(this.src) {
      this.fetchSummary(this.src);
    }
    this.renderSummary();
  }
}

customElements.define('cdx-summary', CDXSummary);
