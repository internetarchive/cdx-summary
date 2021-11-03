# CDX Summary

Summarize web archive capture index (CDX) files.

## Installation

```
$ pip install cdxsummary
```

Alternatively, install from the source.

```
$ python3 setup.py install
```

To run the tool as a one-off Docker container, build the image as following, which will place the `cdxsummary` executable as the entrypoint script of the container.

```
$ docker image build -t cdxsummary .
$ docker container run -it --rm cdxsummary
```

## Features

* Summarize local CDX files or remote ones over HTTP
* Handle `gz` and `bz2` compression seamlessly
* Handle CDX data input to `STDIN` from pipe
* Support [Internet Archive Petabox web item](https://archive.org/services/docs/api/items.html) summarization
* Seamless authorization to Internet Archive via the [`ia` CLI tool](https://archive.org/services/docs/api/internetarchive/quickstart.html#configuring)
* Human-friendly summary by default, but support summarized or detailed JSON reports
* Self-aware, as the input can be a previously generated JSON report in place of CDX data
* Summary includes:
  * An overview of numbers of captures, consecutive unique URIs, unique hosts, accumulated WARC records size, and the first and last datetimes
  * A grid of media types and status codes and their respective capture counts
  * Top-N (configurable) hosts and their capture counts
  * A random sample of N (configurable) memento URIs for `200 OK` HTML pages

## Usage

```
$ cdxsummary --help
usage: cdxsummary [-h] [-a [HOST:PORT]] [-i] [-j] [-l] [-o [FILE]] [-r] [-s [N]] [-t [N]] [-v] [input]

Summarize web archive capture index (CDX) files.

positional arguments:
  input                 CDX file path/URL (plain/gz/bz2) or an IA item ID to process (reads from the STDIN, if empty or '-')

optional arguments:
  -h, --help            show this help message and exit
  -a [HOST:PORT], --api [HOST:PORT]
                        Run a CDX summarizer API server on the given host and port (default: 0.0.0.0:5000)
  -i, --item            Treat the input argument as a Petabox item identifier instead of a file path
  -j, --json            Generate summary in JSON format
  -l, --load            Load JSON report instead of CDX
  -o [FILE], --out [FILE]
                        Write output to the given file (default: STDOUT)
  -r, --report          Generate non-summarized JSON report
  -s [N], --samples [N]
                        Number of sample memento URLs in summary (default: 10)
  -t [N], --tophosts [N]
                        Number of hosts with maximum captures in summary (default: 10)
  -v, --version         Show version number
```
