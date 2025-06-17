import asyncio
import colorsys
import io
import os
import subprocess
from pathlib import Path
from time import sleep
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import urlopen

import aiohttp
import requests
from colorthief import ColorThief
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image, ImageCms, ImageOps
from requests.exceptions import ConnectionError, InvalidSchema, SSLError

from apps.utils.exceptions import capture_exception
from apps.utils.lang import get_site_by_current_language

COLOR_TEMPLATE = '{:02x}{:02x}{:02x}'
DEFAULT_COLOR_TUPLE = (15, 15, 15)
DEFAULT_COLOR = COLOR_TEMPLATE.format(*DEFAULT_COLOR_TUPLE)
stdout = None if settings.DEBUG else subprocess.DEVNULL


class ImageException(Exception):
    def __init__(self, message):
        self.message = message


def check_color(color):
    result = []
    for c in color:
        if c > 255:
            c = 255
        result.append(c)
    return result


def get_url(url):
    r = requests.get(url)
    if r.status_code != 200:
        raise ImageException
    return io.BytesIO(r.content)


def calculate_dominant_color(image, url=False):
    top_rgb = [150, 150, 220]
    if url:
        # noinspection PyBroadException
        try:
            image = get_url(image)
        except Exception:
            return DEFAULT_COLOR
    color_thief = ColorThief(image)
    # noinspection PyBroadException
    try:
        color = color_thief.get_color(quality=5)
    except Exception:
        return DEFAULT_COLOR
    result = []
    for i, d in enumerate(color):
        if d > top_rgb[i]:
            d = top_rgb[i]
        result.append(d)
    result = COLOR_TEMPLATE.format(*check_color(result))
    if result == COLOR_TEMPLATE.format(*top_rgb):
        return DEFAULT_COLOR
    return result


def calculate_saturated_color(image, url=False):
    if url:
        # noinspection PyBroadException
        try:
            image = get_url(image)
        except Exception:
            return DEFAULT_COLOR
    color_thief = ColorThief(image)
    # noinspection PyBroadException
    try:
        colors = color_thief.get_palette(color_count=20, quality=5)
    except Exception:
        return DEFAULT_COLOR
    max_color = DEFAULT_COLOR_TUPLE
    max_saturated = 0
    max_saturated_bright = 0
    for color in colors:
        bright = 0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]
        saturated = colorsys.rgb_to_hsv(color[0] / 255, color[1] / 255, color[2] / 255)[1]
        first = not max_saturated
        limit = saturated <= 0.75
        more1 = saturated > max_saturated
        more2 = saturated == max_saturated and bright > max_saturated_bright
        if first or (limit and (more1 or more2)):
            max_saturated = saturated
            max_saturated_bright = bright
            max_color = color
    return COLOR_TEMPLATE.format(*check_color(max_color))


def field_to_jpg(field):
    image = Image.open(field.file)
    width, height = image.size
    ext = field.name.lower()
    if not ext.endswith('.jpg') and not ext.endswith('.jpeg'):
        field.name = '{}.jpg'.format(field.file.name)
    if image.format.lower() == 'jpeg':
        return field, width, height
    image = cmyk_to_rgb(image)
    output = io.BytesIO()
    image.save(output, format='JPEG')
    output.seek(0)
    output = jpeg_optimize(stdin=output)
    return (
        InMemoryUploadedFile(ContentFile(output), 'ImageField', field.name, 'image/jpeg', image.size, None),
        width, height
    )


def field_to_png_or_jpg(field, except_for=None):
    image = Image.open(field.file)
    name = field.name.lower()
    image_format = image.format.lower()
    if image_format == 'jpeg':
        if not name.endswith('.jpg') and not name.endswith('.jpeg'):
            field.name = '{}.jpg'.format(field.file.name)
        image = cmyk_to_rgb(image)
    if image_format == 'png':
        if not name.endswith('.png'):
            field.name = '{}.png'.format(field.file.name)
    if except_for and image_format == except_for:
        if not name.endswith('.'.format(except_for)):
            field.name = '{}.{}'.format(field.file.name, except_for)
        return field
    output = io.BytesIO()
    image.save(output, format=image.format)
    output.seek(0)
    if image_format == 'jpeg':
        output = ContentFile(jpeg_optimize(stdin=output))
    else:
        output = ContentFile(png_optimize(stdin=output))
    return InMemoryUploadedFile(output, 'ImageField', field.name, 'image/{}'.format(image_format), image.size, None)


def resize(file, sizes):
    for size in sizes:
        resize_one(file, size, os.path.join('resize', str(size), '-', file.name))


def crop(file, sizes):
    for width, height in sizes:
        crop_one(file, width, height, os.path.join('crop', str(width), str(height), file.name))


def resize_one(original, width, output, is_png=False):
    return process_one(original, width, 0, output, is_png)


def crop_one(original, width, height, output, is_png=False):
    return process_one(original, width, height, output, is_png, False)


def process_one(original, width, height, output, is_png=False, is_resize=True):
    image = Image.open(original)
    if not is_png:
        image = cmyk_to_rgb(image)
    if is_resize:
        if image.size[0] > width:
            percent = width / float(image.size[0])
            image = image.resize((width, int((float(image.size[1]) * float(percent)))), Image.LANCZOS)
    else:
        image = ImageOps.fit(image, (width, height), Image.LANCZOS)
    if is_png:
        kwargs = {'format': 'PNG'}
    else:
        kwargs = {'format': 'JPEG', 'subsampling': 0, 'quality': 100}
    buffer = io.BytesIO()
    image.save(buffer, **kwargs)
    buffer.seek(0)
    if is_png:
        result = png_optimize(stdin=buffer)
    else:
        result = jpeg_optimize(stdin=buffer, loss=True)
    buffer.close()
    return default_storage.save(output, ContentFile(result))


def get_size(original):
    return Image.open(original).size


def get_image(img, retry=True):
    try:
        response = requests.get(img)
    except InvalidSchema:
        try:
            return img, urlopen(img).read()
        except URLError as e:
            raise ImageException('Image error: {}'.format(e))
    except (ConnectionError, SSLError) as e:
        if retry:
            sleep(5)
            return get_image(img, False)
        raise ImageException('Image error: {}'.format(e))
    if response.status_code != 200 or not response.content:
        if retry:
            sleep(5)
            return get_image(img, False)
        raise ImageException('Image error: {} - {}'.format(response.status_code, response.content))
    return response.url, response.content


async def async_image(session, url):
    async with session.get(url, raise_for_status=True) as response:
        return str(response.url), await response.read()


async def async_images(urls, loop):
    # if you have problems with ssl add
    # connector=aiohttp.TCPConnector(verify_ssl=False)
    async with aiohttp.ClientSession(loop=loop) as session:
        return await asyncio.gather(
            *[loop.create_task(async_image(session, url)) for url in urls],
            return_exceptions=True
        )


def get_images_loop(images, write_exceptions=False):
    output = []
    loop = asyncio.get_event_loop()
    for result in loop.run_until_complete(async_images(images, loop)):
        if isinstance(result, Exception):
            if write_exceptions:
                capture_exception(result)
            output.append(None)
            continue
        output.append(result)
    return output


def get_images(images):
    if not settings.USE_ASYNCIO:
        return [get_image(image) for image in images]
    errors = []
    images = list(images)
    results = get_images_loop(images)
    for i, result in enumerate(results):
        if not result:
            errors.append([images[i], i])
    if errors:
        sleep(3)
        for i, result in enumerate(get_images_loop([url for url, _ in errors], write_exceptions=True)):
            if not result:
                continue
            results[errors[i][1]] = result
    return [result for result in results if result]


def content_to_jpeg_file(url, content, min_size=None, sizes=False):
    buffer = io.BytesIO(content)
    try:
        jpg = Image.open(buffer)
    except (OSError, ValueError):
        raise ImageException('Image error: This is not a valid image')
    if min_size and (jpg.size[0] < min_size or jpg.size[1] < min_size):
        raise ImageException(f'Image error: the size is too small: {jpg.size}')
    if jpg.format.upper() != 'JPEG':
        jpg = cmyk_to_rgb(jpg)
        buffer = io.BytesIO()
        jpg.save(buffer, 'JPEG')
        buffer.seek(0)
    result = jpeg_optimize(stdin=buffer)

    name = urlparse(url).path.split('/')[-1]
    if '.' in name:
        name = name.split('.')[0]

    results = ['{}.jpg'.format(name), ContentFile(result)]
    if sizes:
        results += list(jpg.size)
    return results


def cmyk_to_rgb(image):
    if image.mode == 'CMYK':
        cmyk = Path(settings.BASE_DIR, 'project', 'templates', 'profiles', 'USWebCoatedSWOP.icc')
        srgb = Path(settings.BASE_DIR, 'project', 'templates', 'profiles', 'sRGB2014.icc')
        image = ImageCms.profileToProfile(
            image, str(cmyk.resolve()), str(srgb.resolve()), renderingIntent=0, outputMode='RGB'
        )
    elif image.mode in ('RGBA', 'LA'):
        background = Image.new(image.mode[:-1], image.size, 'black')
        background.paste(image, image.split()[-1])
        image = background
    elif image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')
    return image


def jpeg_optimize(file_name=None, stdin=None, loss=False):
    command = ['convert', '-strip', '-sampling-factor', '4:2:0', '-colorspace', 'sRGB', '-interlace', 'JPEG']
    if loss:
        command += ['-quality', '85']
    if stdin:
        command += ['-', '-']
        return subprocess.check_output(command, input=stdin.getvalue())
    command += [file_name, file_name]
    return subprocess.check_call(command, stdout=stdout)


def png_optimize(file_name=None, stdin=None):
    command = ['convert', '-strip']
    if stdin:
        command += ['-', '-']
        return subprocess.check_output(command, input=stdin.getvalue())
    command += [file_name, file_name]
    return subprocess.check_call(command, stdout=stdout)


def is_gif(content):
    buffer = io.BytesIO(content)
    try:
        jpg = Image.open(buffer)
    except OSError:
        raise ImageException('Image error: This is not a valid image')
    return jpg.format.upper() == 'GIF'


def get_image_url(image):
    site = settings.MEDIA_URL
    if site[0] == '/':
        site = '{}://{}{}'.format(settings.SITE_PROTOCOL, get_site_by_current_language().domain, settings.MEDIA_URL)
    return '{}{}'.format(site, image)


def fix_http_url(image):
    image = image.replace('http://cdn.akamai.steamstatic.com/', 'https://steamcdn-a.akamaihd.net/', 1)
    image = image.replace('http://image.xboxlive.com/', 'https://image-ssl.xboxlive.com/', 1)
    image = image.replace('http://images-eds.xboxlive.com/', 'https://images-eds-ssl.xboxlive.com/', 1)
    image = image.replace('http://download.xbox.com/', 'https://download-ssl.xbox.com/', 1)
    # image = image.replace('http://', 'https://', 1)
    return image
