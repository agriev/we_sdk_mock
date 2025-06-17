import json
import subprocess
from datetime import timedelta

from django.conf import settings

stdout = None if settings.DEBUG else subprocess.DEVNULL


def video_to_image(url, file_name, second=3):
    return subprocess.check_call(
        ['/usr/bin/env', 'ffmpeg', '-v', 'quiet', '-ss', str(second), '-i', url, '-vframes', '1', '-y', file_name],
        stdout=stdout, stderr=stdout
    )


def video_length(file_name):
    result = subprocess.check_output([
        '/usr/bin/env',
        'ffprobe',
        '-v', 'quiet',
        '-i', file_name,
        '-show_entries',
        'format=duration',
        '-of', 'json',
    ])
    return int(float(json.loads(result)['format']['duration']))


def video_segment(file_name, result_file_name, start_second, length):
    subprocess.check_output([
        '/usr/bin/env',
        'ffmpeg',
        '-v', 'quiet',
        '-y',
        '-ss', str(timedelta(seconds=start_second)),
        '-t', str(length),
        '-i', file_name,
        result_file_name,
    ])


def video_resize(file_name: str, result_file_name: str, size: int) -> None:
    subprocess.check_output([
        '/usr/bin/env',
        'ffmpeg',
        '-v', 'quiet',
        '-y',
        '-i', file_name,
        '-vf', f'scale={size}:-2',
        result_file_name,
    ])


def video_concat(files, logos, output, scale=False):
    count = len(files)
    attrs = []
    filters_first = []
    filters_second = []
    for i, file in enumerate(files):
        attrs.append('-i')
        attrs.append(file)
        scale_file = f'[{i}]'
        if scale:
            scale_file = f'[{i}:v]scale={scale},setsar=sar=1[v{i}], [v{i}]'
        filters_first.append(f'{scale_file}[{count + i}]overlay[v{i}]')
        filters_second.append(f'[v{i}][{i}:a]')
    for logo in logos:
        attrs.append('-i')
        attrs.append(logo)
    subprocess.check_output([
        '/usr/bin/env',
        'ffmpeg',
        '-v', 'quiet',
        '-y',
        *attrs,
        '-filter_complex',
        f'{", ".join(filters_first)}, {"".join(filters_second)} concat=n={count}:a=1',
        output,
    ])
