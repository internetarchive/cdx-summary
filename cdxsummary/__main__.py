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

if not __package__:
    sys.path.insert(1, os.path.dirname(os.path.dirname(os.path.realpath(__file__))))

from cdxsummary import __NAME, __VERSION
from cdxsummary.summarizer import ReportSummarizer
from cdxsummary.analyzer import CDXAnalyzer


ITEMURL = re.compile("^https?://archive.org/(?:download|details)/(?P<id>[^/]+)/?$", re.IGNORECASE)
URLRE = re.compile("^https?://.+", re.IGNORECASE)

REQSESSION = Session()
IASESSION = get_session()


def argument_parser():
    ap = argparse.ArgumentParser(prog=__NAME, description="Summarize web archive capture index (CDX) files.")
    ap.add_argument("-a", "--api", nargs="?", const="0.0.0.0:5000", metavar="HOST:PORT", help="Run a CDX summarizer API server on the given host and port (default: 0.0.0.0:5000)")
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


def get_stream_from_url(url):
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
    return fileinput.input(files=file, mode="rb", openhook=fileinput.hook_compressed)


def main():
    ap = argument_parser()
    args = ap.parse_args()

    if args.api:
        sys.exit("[TODO] API server is not implemented yet!")

    if os.isatty(sys.stdin.fileno()) and not args.input:
        ap.print_help(file=sys.stderr)
        sys.exit()

    input_url = get_input_url(args)
    try:
        input_stream = get_stream_from_url(input_url) if input_url else get_stream_from_file(args.input)
        maxhosts = None if args.report else args.tophosts
        cdxanalizer = CDXAnalyzer(samplesize=args.samples, maxhosts=maxhosts, outfile=args.out)
        if args.load:
            report = cdxanalizer.load(b"".join(input_stream))
        else:
            report = cdxanalizer(input_stream)
    except OSError as e:
        sys.exit(e)
    except Exception as e:
        print(e, file=sys.stderr)
        if str(e).startswith("403") and "archive.org/download/" in input_url and not IASESSION.cookies:
            print("\nIf you have access to this private Internet Archive file, configure your credentials using the 'ia' CLI tool and try again.\n\nDocumentation: https://archive.org/services/docs/api/internetarchive/quickstart.html#configuring", file=sys.stderr)
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
