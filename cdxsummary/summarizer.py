import sys

from datetime import datetime
from humanize import intcomma, naturalsize, naturaldate
from json import dumps
from os import getenv
from random import random
from rich.console import Console
from rich.json import JSON
from rich.table import Table, box


class ReportSummarizer():
    PSEGMENTS = [f"P{i}" for i in range(5)] + ["Other"]
    QSEGMENTS = [f"Q{i}" for i in range(5)] + ["Other"]
    MONTHS = [f"{i:02}" for i in range(1, 13)]
    CODEGROUPS = ["2XX", "3XX", "4XX", "5XX", "Other"]

    MIMEMAP = {
        "html": "HTML",
        "image": "Image",
        "css": "CSS",
        "javascript": "JavaScript",
        "json": "JSON",
        "xml": "XML",
        "plain": "Text",
        "pdf": "PDF",
        "font": "Font",
        "audio": "Audio",
        "video": "Video",
        "revisit": "Revisit",
        "other": "Other"
    }


    def _mime_group(self, mime):
        group, _, subtype = mime.lower().partition("/")
        for part in [subtype, group]:
            try:
                return self.MIMEMAP[part]
            except KeyError:
                pass
        if subtype.startswith("xhtml"):
            return "HTML"
        if subtype.endswith("+xml") or subtype.startswith("xml-"):
            return "XML"
        return "Other"


    def _valid_status(self, code):
        return code >= "200" and code < "600"


    def _status_group(self, code):
        return f"{code[0]}XX" if self._valid_status(code) else "Other"


    def _path_query_grid(self, pq):
        grid = {path: {query: 0 for query in self.QSEGMENTS} for path in self.PSEGMENTS}
        for path, queries in pq.items():
            path = path if path in self.PSEGMENTS else "Other"
            for query, count in queries.items():
                query = query if query in self.QSEGMENTS else "Other"
                grid[path][query] += count
        return grid


    def _year_month_grid(self, ym):
        grid = {}
        for year in sorted(ym):
            grid[year] = {}
            for month in self.MONTHS:
                grid[year][month] = ym[year].get(month, 0)
        return grid


    def _mime_status_grid(self, ms):
        grid = {mime: {code: 0 for code in self.CODEGROUPS} for mime in self.MIMEMAP.values()}
        for mime, codes in ms.items():
            mg = self._mime_group(mime)
            for code, count in codes.items():
                sg = self._status_group(code)
                grid[mg][sg] += count
        return grid


    def _non_zero_grid_rows(self, grid):
        return sum([bool(sum(v.values())) for v in grid.values()])


    def _natural_date(self, dt):
        try:
            return naturaldate(datetime.strptime(dt, "%Y%m%d%H%M%S"))
        except ValueError:
            return "UNKNOWN"


    def __init__(self, report, outfile=sys.stdout):
        self._report = report
        self._replayurl = getenv("REPLAYURL", "https://web.archive.org/web")
        self._print = Console(file=outfile).print
        self._summary = {
            **report,
            "pathquery": self._path_query_grid(report["pathquery"]),
            "yearmonth": self._year_month_grid(report["yearmonth"]),
            "mimestatus": self._mime_status_grid(report["mimestatus"])
        }


    def __call__(self):
        return self._summary


    def __str__(self):
        return dumps(self._summary)


    def print_overview(self):
        table = Table(title="CDX Overview", box=box.HORIZONTALS, show_header=False, padding=(0, 0))
        table.add_column(style="bold cyan")
        table.add_column(style="bold magenta", justify="right")
        table.add_row("Total Captures in CDX", intcomma(self._summary["captures"]))
        table.add_row("Consecutive Unique URLs", intcomma(self._summary["urls"]))
        table.add_row("Consecutive Unique Hosts", intcomma(self._summary["hosts"]))
        table.add_row("Total WARC Records Size", naturalsize(self._summary["bytes"]))
        table.add_row("First Memento Date", self._natural_date(self._summary["first"]))
        table.add_row("Last Memento Date", self._natural_date(self._summary["last"]))
        self._print(table)


    def print_mimestatus_grid(self):
        mimestatus = self._summary["mimestatus"]
        manyrows = self._non_zero_grid_rows(mimestatus) > 1
        table = Table(title="MIME Type and Status Code Distribution", box=box.HORIZONTALS, show_header=True, show_footer=manyrows, header_style="bold magenta", footer_style="bold magenta", padding=(0, 0))
        table.add_column("MIME", "TOTAL", style="bold cyan", overflow="fold")
        for code in self.CODEGROUPS:
            table.add_column(code, intcomma(sum([codes[code] for codes in mimestatus.values()])), justify="right", overflow="fold")
        table.add_column("TOTAL", intcomma(self._summary["captures"]), style="bold cyan", justify="right", overflow="fold")
        for mime, codes in mimestatus.items():
            row_total = sum(codes.values())
            if row_total:
                table.add_row(mime, *map(intcomma, codes.values()), intcomma(row_total))
        self._print(table)


    def print_pathquery_grid(self):
        pathquery = self._summary["pathquery"]
        manyrows = self._non_zero_grid_rows(pathquery) > 1
        table = Table(title="Path and Query Segments", box=box.HORIZONTALS, show_header=True, show_footer=manyrows, header_style="bold magenta", footer_style="bold magenta", padding=(0, 0))
        table.add_column("Path", "TOTAL", style="bold cyan", overflow="fold")
        for query in self.QSEGMENTS:
            table.add_column(query, intcomma(sum([queries[query] for queries in pathquery.values()])), justify="right", overflow="fold")
        table.add_column("TOTAL", intcomma(self._summary["captures"]), style="bold cyan", justify="right", overflow="fold")
        for path, queries in pathquery.items():
            row_total = sum(queries.values())
            if row_total:
                table.add_row(path, *map(intcomma, queries.values()), intcomma(row_total))
        self._print(table)


    def print_yearmonth_grid(self):
        yearmonth = self._summary["yearmonth"]
        manyrows = self._non_zero_grid_rows(yearmonth) > 1
        table = Table(title="Year and Month Distribution", box=box.HORIZONTALS, show_header=True, show_footer=manyrows, header_style="bold magenta", footer_style="bold magenta", padding=(0, 0))
        table.add_column("Year", "TOTAL", style="bold cyan", overflow="fold")
        for month in self.MONTHS:
            table.add_column(month, intcomma(sum([months[month] for months in yearmonth.values()])), justify="right", overflow="fold")
        table.add_column("TOTAL", intcomma(self._summary["captures"]), style="bold cyan", justify="right", overflow="fold")
        for year, months in yearmonth.items():
            row_total = sum(months.values())
            if row_total:
                table.add_row(year, *map(intcomma, months.values()), intcomma(row_total))
        self._print(table)


    def print_tophosts(self):
        tophosts = self._summary["tophosts"]
        others = self._summary["hosts"] - len(tophosts)
        table = Table(title=f"Top {len(tophosts)} Out of {intcomma(self._summary['hosts'])} Hosts", box=box.HORIZONTALS, show_header=True, show_footer=(others > 0), header_style="bold magenta", footer_style="bold magenta", padding=(0, 0))
        table.add_column("Host", f"OTHERS ({intcomma(others)} Hosts)", style="bold cyan", overflow="fold")
        table.add_column("Captures", intcomma(self._summary["captures"] - sum(tophosts.values())), justify="right", overflow="fold")
        for host, count in tophosts.items():
            table.add_row(host, intcomma(count))
        self._print(table)


    def print_samples(self):
        samples = self._summary.get("samples", [])
        if not samples:
            return
        self._print(f"Random Sample of {intcomma(len(samples))} OK HTML Mementos", width=50, justify="center", style="italic", highlight=False)
        self._print(f" {'─' * 48}")
        for dt, url in samples:
            self._print(f" * [dim]{self._replayurl}[/dim]/[cyan]{dt}[/cyan]/[magenta]{url}[/magenta]", soft_wrap=True, highlight=False)


    def print_summary(self):
        print("")
        self.print_overview()
        print("")
        self.print_mimestatus_grid()
        print("")
        self.print_pathquery_grid()
        print("")
        self.print_yearmonth_grid()
        print("")
        self.print_tophosts()
        print("")
        self.print_samples()
        print("")


    def print_summary_json(self):
        self._print(JSON.from_data(self._summary), soft_wrap=True)
