from random import random


class BaseSampler():
    def __init__(self, size=0, valid=lambda item: True, transform=lambda item: item):
        self._size = size
        self._samples = [None] * size
        self._processed = 0
        self._valid = valid
        self._transform = transform


    def __call__(self, item):
        pass


    def samples(self):
        return filter(lambda sample: sample is not None, self._samples)


    def __str__(self):
        return str(self.samples())


class DynamicRandomStreamSampler(BaseSampler):
    def __call__(self, item):
        if not self._valid(item):
            return
        quotient, remainder = divmod(self._processed, self._size)
        if random() < 1 / (quotient + 1):
            self._samples[remainder] = self._transform(item)
        self._processed += 1
