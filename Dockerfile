#!/usr/bin/env -S docker image build -t cdxsummary . -f

FROM        python:3

WORKDIR     /app

RUN         pip install \
                internetarchive \
                humanize \
                requests \
                rich

COPY        . ./
RUN         python3 setup.py install

ENTRYPOINT  ["cdxsummary"]
