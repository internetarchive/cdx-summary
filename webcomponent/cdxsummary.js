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
    let i = Math.log(s)/Math.log(1024) | 0;
    return `${Number((s/Math.pow(1024, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
  }

  toSn(n) {
    let i = Math.log10(n)/3 | 0;
    return `${Number((n/Math.pow(1000, i)).toFixed(1))}${['', 'K', 'M', 'B', 'T'][i]}`;
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

  numCell(n, h='') {
    return `<td title="${[h, this.toPerc(n), this.toSn(n), this.toNum(n)].filter(i => i).join('\n')}">${this.formatter(n)}</td>`;
  }

  numSum(nums) {
    return nums.reduce((s, v) => s + v, 0);
  }

  urim(dt, urir, mod='') {
    return `${this.playback}/${dt}${mod}/${urir}`;
  }

  randNums(size, samples=1) {
    const sidx = [...Array(size).keys()];
    if(samples >= size) {
      return sidx;
    }
    const ridx = [];
    for (let i=0; i < samples; i++) {
      const r = Math.floor(Math.random()*(size-i));
      ridx[i] = sidx[r];
      sidx[r] = sidx[size-i-1];
    }
    return ridx;
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
    if(!cols.length) {
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
        return this.numCell(o[1][c], `${o[0]} - ${format(c)}`);
      }).join('\n')}
      ${this.numCell(this.numSum(Object.values(o[1])), o[0])}
    </tr>`
  }).join('\n')}
  </tbody>
  ${Object.keys(obj).length > 1 && `
  <tfoot>
    <tr>
      <th scope="col">TOTAL</th>
      ${cols.map(c => this.numCell(colSum[c], format(c))).join('\n')}
      ${this.numCell(this.data.captures, 'ALL')}
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
      ${this.numCell(h[1], h[0])}
    </tr>`
  }).join('\n')}
  </tbody>
  ${otherHostsCount > 0 && `
  <tfoot>
    <tr>
      <th scope="row">OTHERS (${this.toNum(otherHostsCount)} Hosts)</th>
      ${this.numCell(otherHostsTotal, 'OTHERS')}
    </tr>
  </tfoot>`}
</table>
`;
  }

  sampleCapturesList() {
    return `
<details${this.fold.includes('samples') ? '' : ' open'} class="samples">
<summary data-open="Hide Sample URIs" data-close="Show ${this.data.samples.length} Random Sample URIs"></summary>
<ul>
${this.data.samples.map(s => s.concat(s[1].replace(/^(https?:\/\/)?(www\.)?/i, ''))).sort((a, b) => a[2].length - b[2].length).map(s => `<li><a href="${this.urim(s[0], s[1])}">${s[2]}</a></li>`).join('\n')}
</ul>
</details>
`;
  }

  sampleThumbs() {
    const s = this.data.samples;
    const ridx = this.randNums(s.length, this.thumbs);
    return this.randNums(s.length, this.thumbs).map(i => `
<div class="thumb-container">
  <div class="thumb" style="animation-delay: -${Math.random()*10|0}s;">
    <a href="${this.urim(s[i][0], s[i][1])}">${s[i][1]}</a>
    <iframe src="${this.urim(s[i][0], s[i][1], 'if_')}" sandbox="allow-same-origin allow-scripts" scrolling="no" frameborder="0" onload="this.style.backgroundColor='white'"></iframe>
  </div>
</div>
`).join('\n');
  }

  renderSummary() {
    const container = this.shadow.getElementById('container');
    if(this.data['msg']) {
      container.innerHTML = `<p class="info"> ${this.data['msg']}</p>`;
      return;
    }

    container.innerHTML = `
<p>
The summary of the <i>${this.name}</i> ${this.type} below is based on the <a href="${this.src}">summary JSON file</a>.
${this.report ? `A more comprehensive <a href="${this.report}">report JSON file</a> is available for detailed analysis and research.` : ''}
</p>

<p class="info">
Hover over on numeric cells to see the values in various formats in the tooltip (percentage values are w.r.t. the total number of captures).
Insignificant values might be reported as <code>0.00%</code>.
</p>

<h2>Overview</h2>
<p${this.compact}>
This overview is based on the sorted unique capture index (CDX) file of all the WARC files in the ${this.type}.
The <code>Total WARC Records Size</code> value is neither the combined size of the WARC files nor the sum of the sizes of the archived resources, instead, it is the sum of the sizes of the compressed WARC Response records (including their headers).
</p>
${this.overviewTable()}

<h2>MIME Type and Status Code</h2>
<p${this.compact}>
The matrix below shows HTTP status code groups of captures of various media types in this ${this.type}.
The <code>Revisit</code> records do not represent an independent media type, instead, they reflect an unchanged state of representations of resources from some of their prior observations (i.e., the same content digest for the same URI).
The <code>TOTAL</code> column shows combined counts for each media type irrespective of their HTTP status code and the <code>TOTAL</code> row (displayed only if there are more than one media types listed) shows the combined counts of each HTTP status code group irrespective of their media types.
</p>
${this.gridTable(this.data.mimestatus, 'MIME')}

<h2>Path Segment and Query Parameter</h2>
<p${this.compact}>
The matrix below shows the number of path segments and the number of query parameters of various URIs in this ${this.type}.
For example, the cell <code>P0</code> and <code>Q0</code> shows the number of captures of homepages of various hosts with zero path segments and zero query parameters.
The URI <code>https://example.com/img/logo.png?width=300&height=100&screen=highres</code> has two path segments (i.e., <code>/img/logo.png</code>) and three query parameters (i.e., <code>width=300&height=100&screen=highres</code>), hence counted under the <code>P2</code> and <code>Q3</code> cell.
The <code>TOTAL</code> column shows combined counts for URIs with a specific number of path segments irrespective of their number of query parameters and the <code>TOTAL</code> row (displayed only if there are URIs with a varying number of path segments) shows the combined counts for URIs with a specific number of query parameters irrespective of their number of path segments.
</p>
${this.gridTable(this.data.pathquery, 'Path')}

<h2>Year and Month</h2>
<p${this.compact}>
The matrix below shows the number of captures of this ${this.type} observed in different calendar years and months.
The <code>TOTAL</code> column shows combined counts for corresponding years and the <code>TOTAL</code> row (displayed only if the captures were observed across multiple calendar years) shows the combined number of captures observed in the corresponding calendar months irrespective of their years.
</p>
${this.gridTable(this.data.yearmonth, 'Year', Object.keys(Object.values(this.data.yearmonth)[0]).sort(), this.toMonth)}

<h2>Top <i>${this.toNum(Object.keys(this.data.tophosts).length)}</i> Out of <i>${this.toNum(this.data.hosts)}</i> Hosts</h2>
<p${this.compact}>
The table below shows the top hosts of this ${this.type} based on the number of captures of URIs from each host.
The <code>OTHERS</code> row, if present, is the sum of the longtail of hosts.
</p>
${this.topHostsTable()}

<h2>Random HTML Capture Samples</h2>
${this.thumbs ? `
<button id="thumb-loader">Load ${this.thumbs == 1 ? 'a sample' : `${this.thumbs} samples`}</button>
<div id="sample-thumbs">
${this.fold.includes('thumbs') ? '' : this.sampleThumbs()}
</div>` : ''
}
<p${this.compact}>
Below is a list of random sample of captured URIs linked to their corresponding Wayback Machine playback URIs from this ${this.type}.
The sample is chosen only from captures that were observed with the <code>text/html</code> media type and <code>200 OK</code> HTTP status code.
Any unexpected URIs listed below (e.g., with a <code>.png/.jpg/.pdf</code> file extension) are likely a result of the Soft-404 issue from the origin server.
</p>
${this.sampleCapturesList()}
`;

    if(this.thumbs) {
      this.shadow.getElementById('thumb-loader').onclick = e => {
        this.shadow.getElementById('sample-thumbs').innerHTML = this.sampleThumbs();
      };
    }
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
    this.format = this.getAttribute('format') || 'local';
    this.formatter = (this.format == 'short') ? this.toSn : (this.format == 'percent') ? this.toPerc : this.toNum
    this.fold = (this.getAttribute('fold') || '').split(/\W+/).filter(Boolean);
    this.compact = this.fold.includes('description') ? ` title="Click to expand, if truncated..." class="compact" onclick="this.classList.toggle('compact')"` : '';
    this.type = this.getAttribute('type') || 'CDX';
    this.name = this.getAttribute('name') || '';
    this.report = this.getAttribute('report') || '';
    this.src = this.getAttribute('src') || '';
    this.item = this.getAttribute('item') || '';
    if(this.item && !this.src) {
      this.src = `${this.PETABOX}${this.item}/${this.item}.summary.json`;
    }
    if(this.item && !this.report) {
      this.report = `${this.PETABOX}${this.item}/${this.item}.report.json.gz`;
    }
    if(!this.name) {
      this.name = this.src.split('/').pop().replace(/(.summary)?.json$/, '');
    }
    this.data['msg'] = this.src ? 'Loading summary...' : 'Either "src" or "item" attribute is required for the &lt;cdx-summary&gt; element!';

    this.shadow.innerHTML = `
<style>
  #container {
    color: var(--cdxsummary-main-txt-color);
    background: var(--cdxsummary-main-bg-color);
    font-family: var(--cdxsummary-main-font-family, sans-serif);
    font-size: var(--cdxsummary-main-font-size);
    margin: var(--cdxsummary-main-margin);
    padding: var(--cdxsummary-main-padding, 5px);
  }
  #container > *:first-child {
    margin-top: 0;
  }
  #container > *:last-child, .samples ul {
    margin-bottom: 0;
  }
  pre, code {
    font-family: var(--cdxsummary-mono-font-family, monospace);
  }
  a {
    color: var(--cdxsummary-link-txt-color, blue);
    background: var(--cdxsummary-link-bg-color);
    text-decoration: var(--cdxsummary-link-txt-decoration, underline);
  }
  a:hover, a:focus {
    text-decoration: underline;
  }
  .info {
    color: var(--cdxsummary-info-txt-color);
    background: var(--cdxsummary-info-bg-color);
    font-family: var(--cdxsummary-info-font-family, var(--cdxsummary-main-font-family, sans-serif));
    font-size: var(--cdxsummary-info-font-size);
    font-style: var(--cdxsummary-info-font-style, italic);
    border: var(--cdxsummary-info-border);
    border-radius: var(--cdxsummary-info-border-radius);
    margin: var(--cdxsummary-info-margin, 5px);
    padding: var(--cdxsummary-info-padding, 5px);
  }
  .info::before {
    content: "i";
    border: 1px solid;
    border-radius: 0.6em;
    line-height: 1em;
    width: 1em;
    display: inline-block;
    text-align: center;
  }
  h2 {
    color: var(--cdxsummary-h2-txt-color);
    background: var(--cdxsummary-h2-bg-color);
    font-family: var(--cdxsummary-h2-font-family);
    font-size: var(--cdxsummary-h2-font-size, 1.5em);
    margin: var(--cdxsummary-h2-margin, 1em 0 0.7em);
    padding: var(--cdxsummary-h2-padding);
  }
  table {
    border-collapse: collapse;
    display: block;
    max-width: fit-content;
    overflow-x: auto;
    white-space: nowrap;
    color: var(--cdxsummary-tbl-txt-color);
    background: var(--cdxsummary-tbl-bg-color);
    font-family: var(--cdxsummary-tbl-font-family);
    font-size: var(--cdxsummary-tbl-font-size);
    margin: var(--cdxsummary-tbl-margin);
  }
  tr:nth-child(even), li:nth-child(even) {
    color: var(--cdxsummary-tbl-alt-txt-color);
    background: var(--cdxsummary-tbl-alt-bg-color);
  }
  th, td {
    text-align: right;
    padding: 2px 2px 2px 10px;
  }
  th:nth-child(1) {
    text-align: left;
    padding: 2px 10px 2px 2px;
  }
  table, thead {
    border-bottom: var(--cdxsummary-tbl-border, 1px solid var(--cdxsummary-tbl-hdr-bg-color, gray));
  }
  table, tfoot {
    border-top: var(--cdxsummary-tbl-border, 1px solid var(--cdxsummary-tbl-hdr-bg-color, gray));
  }
  thead, tfoot {
    color: var(--cdxsummary-tbl-hdr-txt-color, white);
    background: var(--cdxsummary-tbl-hdr-bg-color, gray);
  }
  button {
    color: var(--cdxsummary-btn-txt-color, var(--cdxsummary-tbl-hdr-txt-color, white));
    background: var(--cdxsummary-btn-bg-color, var(--cdxsummary-tbl-hdr-bg-color, gray));
    font-family: var(--cdxsummary-btn-font-family);
    font-size: var(--cdxsummary-btn-font-size);
    border: var(--cdxsummary-btn-border, var(--cdxsummary-tbl-border, 1px solid var(--cdxsummary-tbl-hdr-bg-color, gray)));
    border-radius: var(--cdxsummary-btn-border-radius, 5px);
    margin: var(--cdxsummary-btn-margin, 0 0 10px);
    padding: var(--cdxsummary-btn-padding, 5px 10px);
  }
  .thumb-container {
    display: inline-block;
    overflow: hidden;
    position: relative;
  }
  .thumb {
    width: calc(960px * var(--cdxsummary-thumb-scale, 0.3));
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border: var(--cdxsummary-thumb-border, var(--cdxsummary-tbl-border, 1px solid var(--cdxsummary-tbl-hdr-bg-color, gray)));
    border-radius: var(--cdxsummary-thumb-border-radius, 5px);
    padding: 2px;
    background: linear-gradient(45deg, #eee, #333, #eee);
    background-position: center 2px;
    background-size: 50% 2px;
    background-repeat: no-repeat;
    animation: loader 10s ease infinite;
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
    aspect-ratio: 16 / 10;
    transform-origin: 0 0;
    transform: scale(var(--cdxsummary-thumb-scale, 0.3));
  }
  @keyframes loader {
    0%, 100% {
      background-position: left 10px top 2px;
    }
    50% {
      background-position: right 10px top 2px;
    }
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
  ul {
    word-break: break-all;
    list-style-position: inside;
    padding-inline-start: 0;
  }
  .compact {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
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
