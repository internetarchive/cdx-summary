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


    def _mime_status_grid(self, ms):
        grid = {mime: {code: 0 for code in self.CODEGROUPS} for mime in self.MIMEMAP.values()}
        for mime, codes in ms.items():
            mg = self._mime_group(mime)
            for code, count in codes.items():
                sg = self._status_group(code)
                grid[mg][sg] += count
        return grid


    def _natural_date(self, dt):
        try:
            return naturaldate(datetime.strptime(dt, "%Y%m%d%H%M%S"))
        except ValueError:
            return "UNKNOWN"


    def __init__(self, report, outfile=sys.stdout):
        self._report = report
        self._replayurl = getenv("REPLAYURL", "https://web.archive.org/web")
        self._print = Console(file=outfile).print
        self._summary = {**report, "media": self._mime_status_grid(report["media"])}


    def __call__(self):
        return self._summary


    def __str__(self):
        return dumps(self._summary)


    def print_overview(self):
        table = Table(title="CDX Overview", box=box.HORIZONTALS, show_header=False)
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
        media = self._summary["media"]
        table = Table(title="MIME Type and Status Code Distribution", box=box.HORIZONTALS, show_header=True, show_footer=True, header_style="bold magenta", footer_style="bold magenta")
        table.add_column("MIME", "TOTAL", style="bold cyan")
        for code in self.CODEGROUPS:
            table.add_column(code, intcomma(sum([codes[code] for codes in media.values()])), justify="right")
        table.add_column("TOTAL", intcomma(self._summary["captures"]), style="bold cyan", justify="right")
        for mime, codes in media.items():
            row_total = sum(codes.values())
            if row_total:
                table.add_row(mime, *map(intcomma, codes.values()), intcomma(row_total))
        self._print(table)


    def print_tophosts(self):
        tophosts = self._summary["tophosts"]
        others = self._summary["hosts"] - len(tophosts)
        table = Table(title=f"Top {len(tophosts)} Out of {intcomma(self._summary['hosts'])} Hosts", box=box.HORIZONTALS, show_header=True, show_footer=(others > 0), header_style="bold magenta", footer_style="bold magenta")
        table.add_column("Host", f"OTHERS ({intcomma(others)} Hosts)", style="bold cyan")
        table.add_column("Captures", intcomma(self._summary["captures"] - sum(tophosts.values())), justify="right")
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
        self.print_tophosts()
        print("")
        self.print_samples()
        print("")


    def print_summary_json(self):
        self._print(JSON.from_data(self._summary), soft_wrap=True)
