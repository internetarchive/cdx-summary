class CDXSummary extends HTMLElement {
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
    return (s/Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
  }

  toDate(dt) {
    return `${dt.substring(0, 4)}-${dt.substring(4, 6)}-${dt.substring(6, 8)}`;
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

  overviewTable() {
    return `
<table>
  <tbody>
    <tr>
      <th scope="row">Total Captures in CDX</th>
      <td>${this.toNum(this.data.captures)}</td>
    </tr>
    <tr>
      <th scope="row">Consecutive Unique URLs</th>
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
      <th scope="row">First Memento Date</th>
      <td>${this.toDate(this.data.first)}</td>
    </tr>
    <tr>
      <th scope="row">Last Memento Date</th>
      <td>${this.toDate(this.data.last)}</td>
    </tr>
  </tbody>
</table>
`;
  }

  gridTable(obj, group='', cols) {
    if (!cols) {
      cols = Object.keys(Object.values(obj)[0]);
    }
    const colSum = cols.reduce((a, k) => {a[k] = 0; return a}, {});
    return `
<table>
  <thead>
    <tr>
      <th scope="col">${group}</th>
      ${cols.map(c => `<th scope="col">${c}</th>`).join('\n')}
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

  sampleMementosList() {
    return `
<ul>
${this.data.samples.map(s => `<li><a href="${this.WAYBACK}${s[0]}/${s[1]}">${s[1]}</a></li>`).join('\n')}
</ul>
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

<h2>MIME Type and Status Code Distribution</h2>
<p>
The grid below shows HTTP status code groups of captures of various media types in this item/collection.
The <code>Revisit</code> records do not represents an independent media type, instead, they reflect an unchanged state of representations of resources from some of their prior observations (i.e., the same content digest for the same URI).
The <code>TOTAL</code> column shows combined counts for each media type irrespective of their HTTP status code and the <code>TOTAL</code> row (displayed only if there are more than one media types listed) shows the combined counts of each HTTP status code group irrespective of their media types.
</p>
${this.gridTable(this.data.mimestatus, 'MIME')}

<h2>Path and Query Segments</h2>
<p>
The grid below shows the number of path segments and the number of query parameters of various URIs in this item/collection.
For example, the cell <code>P0</code> and <code>Q0</code> shows the number of captures of homepages of various hosts with zero path segments and zero query parameters.
The <code>TOTAL</code> column shows combined counts for URIs with a specific number of path segments irrespective of their number of query parameters and the <code>TOTAL</code> row (displayed only if there are URIs with a varying number of path segments) shows the combined counts for URIs with a specific number of query parameters irrespective of their number of path segments.
</p>
${this.gridTable(this.data.pathquery, 'Path')}

<h2>Year and Month Distribution</h2>
<p>
The grid below shows the number of captures of this item/collection observed in different calendar years and months.
The <code>TOTAL</code> column shows combined counts for corresponding years and the <code>TOTAL</code> row (displayed only if the captures were observed across multiple calendar years) shows the combined number of captures observed in the corresponding calendar months irrespective of their years.
</p>
${this.gridTable(this.data.yearmonth, 'Year', Object.keys(Object.values(this.data.yearmonth)[0]).sort())}

<h2>Top <i>${this.toNum(Object.keys(this.data.tophosts).length)}</i> Out of <i>${this.toNum(this.data.hosts)}</i> Hosts</h2>
<p>
The table below shows the top hosts of this item/collection based on the number of captures of URIs from each host.
The <code>OTHERS</code> row, if present, is the sum of the longtail of hosts.
</p>
${this.topHostsTable()}

<h2><i>${this.data.samples.length}</i> Random Samples of <i>OK HTML</i> Mementos</h2>
<p>
Below is a list of random sample of captured URIs (i.e., Original URIs or URI-Rs) linked to their corresponding playback URIs (i.e., Memento URIs or URI-Ms) from this item/collection.
The sample is chosen only from mementos that were observed with the <code>text/html</code> media type and <code>200 OK</code> HTTP status code.
Any unexpected URIs listed below (e.g., with a <code>.png/.jpg/.pdf</code> file extension) are likely a result of the Soft-404 issue from the origin server.
</p>
${this.sampleMementosList()}
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