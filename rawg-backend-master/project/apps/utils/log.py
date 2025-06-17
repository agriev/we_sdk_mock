import os
from logging import FileHandler


class MakeFileHandler(FileHandler):
    def __init__(self, filename, mode='a', encoding=None, delay=False):
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        super().__init__(filename, mode, encoding, delay)
