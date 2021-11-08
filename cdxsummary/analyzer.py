import os
import sys

from collections import defaultdict, Counter
from json import dumps, loads
from rich.console import Console
from rich.json import JSON

if not __package__:
    sys.path.insert(1, os.path.dirname(os.path.dirname(os.path.realpath(__file__))))

from cdxsummary.parser import CDXRecord
from cdxsummary.sampler import BaseSampler, DynamicRandomStreamSampler


class CDXAnalyzer():
    def _sample_candidate(self, cdxrec):
        return cdxrec.status == "200" and cdxrec.mime == "text/html" and not cdxrec.surt.endswith("/robots.txt")


    def _sample_parts(self, cdxrec):
        return (cdxrec.datetime, cdxrec.url.replace(":80/", "", 1))


    def _top_hosts(self, th):
        return {".".join(reversed(host.split(","))): count for host, count in th}


    def __init__(self, samplesize=0, urlsampler=None, maxhosts=None, outfile=sys.stdout):
        self._sampler = urlsampler
        if not self._sampler:
            self._sampler = DynamicRandomStreamSampler(size=samplesize, valid=self._sample_candidate, transform=self._sample_parts) if samplesize else BaseSampler()
        self._maxhosts = maxhosts
        self._captures = 0
        self._urls = 0
        self._hosts = 0
        self._bytes = 0
        self._first = "9" * 14
        self._last = "0" * 14
        self._tophosts = Counter()
        self._mimestatus = defaultdict(lambda: defaultdict(int))
        self._pathquery = defaultdict(lambda: defaultdict(int))
        self._yearmonth = defaultdict(lambda: defaultdict(int))
        self._print = Console(file=outfile).print


    def _report(self):
        return {
            "captures": self._captures,
            "urls": self._urls,
            "hosts": self._hosts,
            "bytes": self._bytes,
            "first": self._first.replace("9" * 14, ""),
            "last": self._last.replace("0" * 14, ""),
            "tophosts": self._top_hosts(self._tophosts.most_common(self._maxhosts)),
            "mimestatus": self._mimestatus,
            "pathquery": self._pathquery,
            "yearmonth": self._yearmonth,
            "samples": list(self._sampler.samples())
        }


    def load(self, report_json):
        report = loads(report_json)
        self._captures = report["captures"]
        self._urls = report["urls"]
        self._hosts = report["hosts"]
        self._bytes = report["bytes"]
        self._first = report["first"]
        self._last = report["last"]
        self._tophosts = Counter(report["tophosts"])
        self._mimestatus = report["mimestatus"]
        self._pathquery = report["pathquery"]
        self._yearmonth = report["yearmonth"]
        self._sampler._samples = [(dt, url) for dt, url in report["samples"]]
        return self._report()


    def __call__(self, cdx):
        prev_surt = ""
        prev_host = ""
        for line in cdx:
            try:
                cr = CDXRecord(line.decode())
            except:
                continue
            self._captures += 1
            if prev_surt != cr.surt:
                prev_surt = cr.surt
                self._urls += 1
            if self._first > cr.datetime:
                self._first = cr.datetime
            if self._last < cr.datetime:
                self._last = cr.datetime
            try:
                self._bytes += int(cr.bytes)
            except ValueError:
                pass
            self._tophosts[cr.host] += 1
            if prev_host != cr.host:
                prev_host = cr.host
                self._hosts += 1
            self._pathquery[f"P{cr.pathlen}"][f"Q{cr.querylen}"] += 1
            self._yearmonth[cr.year][cr.month] += 1
            self._mimestatus[cr.mime][cr.status] += 1
            self._sampler(cr)
        return self._report()


    def __str__(self):
        return dumps(self._report())


    def print_report_json(self):
        self._print(JSON.from_data(self._report()), soft_wrap=True)
