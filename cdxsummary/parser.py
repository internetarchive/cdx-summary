import re


CDXREC = re.compile(
    r"^(?P<surt>(?P<host>[^\)\s]+)\)(?P<path>[^\?\s]+)?(\?(?P<query>\S+))?)"
    r"\s(?P<datetime>(?P<year>\d{4})(?P<month>\d{2})(?P<day>\d{2})(?P<hour>\d{2})(?P<minute>\d{2})(?P<second>\d{2}))"
    r"\s(?P<url>\S+)"
    r"\s(?P<mime>\S+)"
    r"\s(?P<status>(-|\d{3}))"
    r"\s(?P<digest>\S+)"
    r"(\s(?P<redirect>[^\s\d]+))?"
    r"(\s(?P<metatags>[^\s\d]+))?"
    r"(\s(?P<bytes>(-|\d+)))?"
    r"(\s(?P<offset>(-|\d+)))?"
    r"(\s(?P<warcfile>\S+))?"
)


class CDXRecord():
    def _segment_length(self, seg, sep):
        return seg.strip(sep).count(sep) + 1 if seg.strip(sep) else 0


    def _parse(self, line):
        return CDXREC.match(line)


    def __init__(self, cdxline):
        m = self._parse(cdxline.strip())
        if not m:
            raise ValueError(f"Invalid CDX line: '{cdxline.strip()}'")
        for key, value in m.groupdict(default="").items():
            setattr(self, key, value)
        self.pathlen = self._segment_length(self.path, '/')
        self.querylen = self._segment_length(self.query, '&')


    def __str__(self):
        return str(self.__dict__)
