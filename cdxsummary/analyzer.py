import os
import sys

from collections import defaultdict, Counter
from json import dumps, loads
from rich.console import Console
from rich.json import JSON

if not __package__:
    sys.path.insert(1, os.path.dirname(os.path.dirname(os.path.realpath(__file__))))

from cdxsummary.sampler import BaseSampler, DynamicRandomStreamSampler


class CDXAnalyzer():
    def _sample_candidate(self, parts):
        return parts[4] == "200" and parts[3] == "text/html" and not parts[0].endswith("/robots.txt")


    def _sample_parts(self, parts):
        return (parts[1], parts[2])


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
        self._media = defaultdict(lambda: defaultdict(int))
        self._print = Console(file=outfile).print


    def _report(self):
        return {
            "captures": self._captures,
            "urls": self._urls,
            "bytes": self._bytes,
            "first": self._first.replace("9" * 14, ""),
            "last": self._last.replace("0" * 14, ""),
            "hosts": self._hosts,
            "tophosts": self._top_hosts(self._tophosts.most_common(self._maxhosts)),
            "media": self._media,
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
        self._media = report["media"]
        self._sampler._samples = [(dt, url) for dt, url in report["samples"]]
        return self._report()


    def __call__(self, cdx):
        prev_url = ""
        prev_host = ""
        for line in cdx:
            parts = line.decode().split()
            if len(parts) == 11:
                self._captures += 1
                if prev_url != parts[0]:
                    prev_url = parts[0]
                    self._urls += 1
                if self._first > parts[1]:
                    self._first = parts[1]
                if self._last < parts[1]:
                    self._last = parts[1]
                try:
                    self._bytes += int(parts[8])
                except ValueError:
                    pass
                host, _, path = parts[0].partition(")")
                self._tophosts[host] += 1
                if prev_host != host:
                    prev_host = host
                    self._hosts += 1
                self._media[parts[3]][parts[4]] += 1
                self._sampler(parts)
        return self._report()


    def __str__(self):
        return dumps(self._report())


    def print_report_json(self):
        self._print(JSON.from_data(self._report()), soft_wrap=True)
