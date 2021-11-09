#!/usr/bin/env python3

import argparse
import bz2
import fileinput
import gzip
import json
import os
import sys
import re

from internetarchive import get_session
from requests import Session
from rich.console import Console
from urllib.parse import urlencode

if not __package__:
    sys.path.insert(1, os.path.dirname(os.path.dirname(os.path.realpath(__file__))))

from cdxsummary import __NAME, __VERSION
from cdxsummary.summarizer import ReportSummarizer
from cdxsummary.analyzer import CDXAnalyzer


CDXAPI = os.getenv("CDXAPI", "https://web.archive.org/cdx/search")
ITEMURL = re.compile("^https?://archive.org/(?:download|details)/(?P<id>[^/]+)/?$", re.IGNORECASE)
URLRE = re.compile("^https?://.+", re.IGNORECASE)

REQSESSION = Session()
IASESSION = get_session()
REQSESSION.headers.update({"User-Agent": f"{__NAME}/{__VERSION}"})
IASESSION.headers.update({"User-Agent": f"{__NAME}/{__VERSION}"})

errprint = Console(stderr=True, style="red", highlight=False).print


def argument_parser():
    ap = argparse.ArgumentParser(prog=__NAME, description="Summarize web archive capture index (CDX) files.")
    ap.add_argument("-a", "--api", nargs="?", const="matchType=exact", metavar="QUERY", help="CDX API query parameters (default: 'matchType=exact'), treats the last argument as the lookup URL")
    ap.add_argument("-i", "--item", action="store_true", help="Treat the input argument as a Petabox item identifier instead of a file path")
    ap.add_argument("-j", "--json", action="store_true", help="Generate summary in JSON format")
    ap.add_argument("-l", "--load", action="store_true", help="Load JSON report instead of CDX")
    ap.add_argument("-o", "--out", nargs="?", type=argparse.FileType("w"), default=sys.stdout, metavar="FILE", help="Write output to the given file (default: STDOUT)")
    ap.add_argument("-r", "--report", action="store_true", help="Generate non-summarized JSON report")
    ap.add_argument("-s", "--samples", nargs="?", type=int, default=10, metavar="N", help="Number of sample memento URLs in summary (default: 10)")
    ap.add_argument("-t", "--tophosts", nargs="?", type=int, default=10, metavar="N", help="Number of hosts with maximum captures in summary (default: 10)")
    ap.add_argument("-v", "--version", action="version", version=f"{__NAME} {__VERSION}", help="Show version number")
    ap.add_argument("input", nargs="?", help="CDX file path/URL (plain/gz/bz2) or an IA item ID to process (reads from the STDIN, if empty or '-')")
    return ap


def get_input_url(args):
    if not args.input:
        return
    m = ITEMURL.match(args.input)
    if m:
        itemid = m.groupdict().get("id")
        return f"https://archive.org/download/{itemid}/{itemid}.cdx.gz"

    if args.item:
        itemid = args.input
        return f"https://archive.org/download/{itemid}/{itemid}.cdx.gz"

    if URLRE.match(args.input):
        return args.input


def get_stream_from_api(url):
    pages = int(REQSESSION.get(f"{url}&showNumPages=true").text)
    for page in range(pages):
        pageurl = f"{url}&page={page}"
        errprint(f"Downloading [[cyan]{page + 1}/{pages}[/cyan]]: [magenta]{pageurl}[/magenta]")
        r = REQSESSION.get(pageurl, stream=True)
        if r.ok:
            r.raw.decode_content = True
            for line in r.raw:
                yield line


def get_stream_from_url(url):
    errprint(f"Downloading remote file: [magenta]{url}[/magenta]")
    session = IASESSION if "archive.org/download/" in url else REQSESSION
    r = session.get(url, stream=True)
    if r.ok:
        r.raw.decode_content = True
        stream = r.raw
        if url.endswith(".gz"):
            stream = gzip.GzipFile(fileobj=r.raw, mode="rb")
        if url.endswith(".bz2"):
            stream = bz2.BZ2File(fileobj=r.raw, mode="rb")
        return stream
    raise Exception(f"{r.status_code} {r.reason}: {url}")


def get_stream_from_file(file):
    if not file or file == "-":
        errprint(f"Summarizing piped data: [magenta]STDIN[/magenta]")
    else:
        errprint(f"Summarizing local file: [magenta]{file}[/magenta]")
    return fileinput.input(files=file, mode="rb", openhook=fileinput.hook_compressed)


def get_input_stream(args):
    if args.api and args.input:
        url = f"{CDXAPI}?{args.api}&{urlencode({'url': args.input})}"
        return get_stream_from_api(url)
    input_url = get_input_url(args)
    if input_url:
        return get_stream_from_url(input_url)
    return get_stream_from_file(args.input)


def main():
    ap = argument_parser()
    args = ap.parse_args()

    if args.api and args.api != "matchType=exact" and not args.input:
        args.input = args.api
        args.api = "matchType=exact"

    if os.isatty(sys.stdin.fileno()) and not args.input:
        ap.print_help(file=sys.stderr)
        sys.exit()

    try:
        input_stream = get_input_stream(args)
        maxhosts = None if args.report else args.tophosts
        cdxanalizer = CDXAnalyzer(samplesize=args.samples, maxhosts=maxhosts, outfile=args.out)
        if args.load:
            report = cdxanalizer.load(b"".join(input_stream))
        else:
            report = cdxanalizer(input_stream)
    except (OSError, Exception) as e:
        errprint(e)
        if str(e).startswith("403") and "archive.org/download/" in str(e) and not IASESSION.cookies:
            errprint("\nIf you have access to this private Internet Archive file, configure your credentials using the 'ia' CLI tool and try again.\n[white]Documentation:[/white] [magenta]https://archive.org/services/docs/api/internetarchive/quickstart.html#configuring[/magenta]")
        sys.exit(1)

    try:
        input_stream.close()
    except:
        pass

    if args.report:
        cdxanalizer.print_report_json()
    else:
        rs = ReportSummarizer(report)
        if args.json:
            rs.print_summary_json()
        else:
            rs.print_summary()


if __name__ == "__main__":
    main()
