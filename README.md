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

## Sample Output

```
$ cdxsummary sample.cdx.gz

               CDX Overview               
 ──────────────────────────────────────── 
  Total Captures in CDX           74,460  
  Consecutive Unique URLs         71,599  
  Consecutive Unique Hosts        12,133  
  Total WARC Records Size        10.2 GB  
  First Memento Date         Mar 18 2021  
  Last Memento Date          Mar 18 2021  
 ──────────────────────────────────────── 

            MIME Type and Status Code Distribution             
 ───────────────────────────────────────────────────────────── 
  MIME            2XX      3XX     4XX   5XX   Other    TOTAL  
 ───────────────────────────────────────────────────────────── 
  HTML         25,853    8,419   6,138   177       1   40,588  
  Image         9,337        8      39     0       0    9,384  
  CSS           4,027        0       0     0       0    4,027  
  JavaScript    4,219        0       0     0       0    4,219  
  JSON            192        1      24     1       0      218  
  XML             463        9      80    13       0      565  
  Text          5,729      185     128     5       0    6,047  
  PDF           3,282       12       1     0       0    3,295  
  Font             83        0       0     0       0       83  
  Audio             7        0       0     0       0        7  
  Video            36        0       0     0       0       36  
  Other         1,250    4,443     270    28       0    5,991  
 ───────────────────────────────────────────────────────────── 
  TOTAL        54,478   13,077   6,680   224       1   74,460  
 ───────────────────────────────────────────────────────────── 

     Top 10 Out of 12,133 Hosts      
 ─────────────────────────────────── 
  Host                     Captures  
 ─────────────────────────────────── 
  cdc.gov                       550  
  facebook.com                  508  
  sec.gov                       476  
  youtube.com                   382  
  fws.gov                       374  
  twitter.com                   370  
  census.gov                    317  
  online.star.bnl.gov           298  
  biomarkers.nlm.nih.gov        289  
  cancer.gov                    248  
 ─────────────────────────────────── 
  OTHERS (12,123 Hosts)      70,648  
 ─────────────────────────────────── 

       Random Sample of 10 OK HTML Mementos       
 ────────────────────────────────────────────────
 * https://web.archive.org/web/20210318000647/https://www.anl.gov/argonne-impacts
 * https://web.archive.org/web/20210318000929/http://www.usarmyjrotc.com/instructor/automation/jcims.php
 * https://web.archive.org/web/20210318000243/https://loc.gov/help/
 * https://web.archive.org/web/20210318000148/http://gp2.pawg.cap.gov/group-2-squadrons/reading-composite-sqdn-811
 * https://web.archive.org/web/20210318001600/https://era.nih.gov/help-tutorials/iedison
 * https://web.archive.org/web/20210318000451/https://www.ftc.gov/policy/hearings-competition-consumer-protection
 * https://web.archive.org/web/20210318000124/https://asap.gov/
 * https://web.archive.org/web/20210318001530/https://espfl.epa.gov/secondary/dataMap
 * https://web.archive.org/web/20210318000510/https://roundme.com/embed/ro6VYzBNE5vePdZ3xyph
 * https://web.archive.org/web/20210318000510/https://prevention.cancer.gov/news-and-events/videos-and-webinars
```

```
$ cdxsummary --json sample.cdx.gz
{
  "captures": 74460,
  "urls": 71599,
  "bytes": 10237687828,
  "first": "20210318000104",
  "last": "20210318003748",
  "hosts": 12133,
  "tophosts": {
    "cdc.gov": 550,
    "facebook.com": 508,
    "sec.gov": 476,
    "youtube.com": 382,
    "fws.gov": 374,
    "twitter.com": 370,
    "census.gov": 317,
    "online.star.bnl.gov": 298,
    "biomarkers.nlm.nih.gov": 289,
    "cancer.gov": 248
  },
  "media": {
    "HTML": {
      "2XX": 25853,
      "3XX": 8419,
      "4XX": 6138,
      "5XX": 177,
      "Other": 1
    },
    "Image": {
      "2XX": 9337,
      "3XX": 8,
      "4XX": 39,
      "5XX": 0,
      "Other": 0
    },
    "CSS": {
      "2XX": 4027,
      "3XX": 0,
      "4XX": 0,
      "5XX": 0,
      "Other": 0
    },
    "JavaScript": {
      "2XX": 4219,
      "3XX": 0,
      "4XX": 0,
      "5XX": 0,
      "Other": 0
    },
    "JSON": {
      "2XX": 192,
      "3XX": 1,
      "4XX": 24,
      "5XX": 1,
      "Other": 0
    },
    "XML": {
      "2XX": 463,
      "3XX": 9,
      "4XX": 80,
      "5XX": 13,
      "Other": 0
    },
    "Text": {
      "2XX": 5729,
      "3XX": 185,
      "4XX": 128,
      "5XX": 5,
      "Other": 0
    },
    "PDF": {
      "2XX": 3282,
      "3XX": 12,
      "4XX": 1,
      "5XX": 0,
      "Other": 0
    },
    "Font": {
      "2XX": 83,
      "3XX": 0,
      "4XX": 0,
      "5XX": 0,
      "Other": 0
    },
    "Audio": {
      "2XX": 7,
      "3XX": 0,
      "4XX": 0,
      "5XX": 0,
      "Other": 0
    },
    "Video": {
      "2XX": 36,
      "3XX": 0,
      "4XX": 0,
      "5XX": 0,
      "Other": 0
    },
    "Revisit": {
      "2XX": 0,
      "3XX": 0,
      "4XX": 0,
      "5XX": 0,
      "Other": 0
    },
    "Other": {
      "2XX": 1250,
      "3XX": 4443,
      "4XX": 270,
      "5XX": 28,
      "Other": 0
    }
  },
  "samples": [
    [
      "20210318000647",
      "https://www.anl.gov/argonne-impacts"
    ],
    [
      "20210318000929",
      "http://www.usarmyjrotc.com/instructor/automation/jcims.php"
    ],
    [
      "20210318000243",
      "https://loc.gov/help/"
    ],
    [
      "20210318000148",
      "http://gp2.pawg.cap.gov/group-2-squadrons/reading-composite-sqdn-811"
    ],
    [
      "20210318001600",
      "https://era.nih.gov/help-tutorials/iedison"
    ],
    [
      "20210318000451",
      "https://www.ftc.gov/policy/hearings-competition-consumer-protection"
    ],
    [
      "20210318000124",
      "https://asap.gov/"
    ],
    [
      "20210318001530",
      "https://espfl.epa.gov/secondary/dataMap"
    ],
    [
      "20210318000510",
      "https://roundme.com/embed/ro6VYzBNE5vePdZ3xyph"
    ],
    [
      "20210318000510",
      "https://prevention.cancer.gov/news-and-events/videos-and-webinars"
    ]
  ]
}
```
