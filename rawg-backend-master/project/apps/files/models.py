import os

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils.functional import cached_property

from apps.utils.fields.autoslug import CIAutoSlugField
from apps.utils.lang import get_site_by_current_language
from apps.utils.models import ProjectModel

LANGUAGES = {
    'au': 'Австралийская',
    'be': 'Бельгийская',
    'br': 'Бразильская',
    'ca': 'Канадская',
    'cn': 'Китайская',
    'cz': 'Чешская',
    'dk': 'Датская',
    'ee': 'Эстооонская',
    'fi': 'Финская',
    'fr': 'Французская',
    'de': 'Немецкая',
    'hu': 'Венгерская',
    'in': 'Индийская',
    'it': 'Итальянская',
    'jp': 'Японская',
    'lv': 'Латвийская',
    'lt': 'Литовская',
    'mx': 'Мексиканская',
    'nl': 'Голландская',
    'no': 'Норвежская',
    'pl': 'Польская',
    'pt': 'Португальская',
    'ro': 'Румынская',
    'ru': 'Русская',
    'kr': 'Корейская',
    'es': 'Испанская',
    'se': 'Шведская',
    'th': 'Тайская',
    'tr': 'Турецкая',
    'ua': 'Украинская',
    'uk': 'Британская',
    'us': 'Американская',
    'un': 'Интернациональная',
    'eu': 'Европейская',
}


def cheat_code(instance, filename):
    return os.path.join('cheats', str(instance.game_id), filename.lower())


class CheatCode(ProjectModel):
    CATEGORY_1 = 'code'
    CATEGORY_2 = 'easter'
    CATEGORY_3 = 'faq'
    CATEGORY_4 = 'hints'
    CATEGORY_5 = 'hex'
    CATEGORY_6 = 'sol'
    CATEGORY_7 = 'edit'
    CATEGORY_8 = 'ghack'
    CATEGORY_9 = 'gwiz'
    CATEGORY_10 = 'mtc'
    CATEGORY_11 = 'save'
    CATEGORY_12 = 'train'
    CATEGORY_13 = 'uge'
    CATEGORY_14 = 'uhs'
    CATEGORY_15 = 'msc'
    CATEGORY_16 = 'amtab'
    CATEGORY_17 = 'sol_pak'
    CATEGORY_18 = 'ach'
    CATEGORY_19 = 'faq_pak'
    CATEGORIES = (
        (CATEGORY_1, 'Cheat-code'),
        (CATEGORY_2, 'Easter egg'),
        (CATEGORY_3, 'FAQ'),
        (CATEGORY_4, 'Hint'),
        (CATEGORY_5, 'HEX-code'),
        (CATEGORY_6, 'Solution'),
        (CATEGORY_7, 'Editor'),
        (CATEGORY_8, 'GH-Table'),
        (CATEGORY_9, 'GW-Table'),
        (CATEGORY_10, 'MTC-Table'),
        (CATEGORY_11, 'Savegame'),
        (CATEGORY_12, 'Trainer'),
        (CATEGORY_13, 'UGE-Module'),
        (CATEGORY_14, 'UHS-Module'),
        (CATEGORY_15, 'Misc.'),
        (CATEGORY_16, 'ArtMoney Table'),
        (CATEGORY_17, 'Solution Packed'),
        (CATEGORY_18, 'Achievement'),
        (CATEGORY_19, 'FAQ Packed'),
    )

    game = models.ForeignKey('games.Game', models.CASCADE)
    category = models.CharField(choices=CATEGORIES, max_length=7, db_index=True)
    description = models.TextField(blank=True, default='')
    file = models.FileField(blank=True, default=None, null=True, upload_to=cheat_code)
    file_size = models.PositiveIntegerField(default=0)
    languages = ArrayField(models.CharField(max_length=2), blank=True, default=list)
    created = models.DateTimeField()

    class Meta:
        ordering = ('-id',)
        verbose_name = 'Cheat Code'
        verbose_name_plural = 'Cheat Codes'

    def __str__(self):
        return str(self.id)

    @classmethod
    def categories(cls):
        if not getattr(cls, '_categories', None):
            cls._categories = dict(cls.CATEGORIES)
        return cls._categories


def file(instance, filename):
    return os.path.join(File.CATEGORIES_FOLDERS[instance.category], str(instance.game_id), filename.lower())


class File(ProjectModel):
    CATEGORY_1 = 'demo'
    CATEGORY_2 = 'patch'
    CATEGORIES = (
        (CATEGORY_1, 'Demo'),
        (CATEGORY_2, 'Patch'),
    )
    CATEGORIES_FOLDERS = {
        CATEGORY_1: 'demos',
        CATEGORY_2: 'patches',
    }
    WINDOWS_1 = 'all'
    WINDOWS_2 = '95'
    WINDOWS_3 = '98'
    WINDOWS_4 = 'nt'
    WINDOWS_5 = '2000'
    WINDOWS_6 = 'xp'
    WINDOWS_11 = 'xp64'
    WINDOWS_12 = '7'
    WINDOWS_7 = 'vista'
    WINDOWS_8 = '3x'
    WINDOWS_9 = 'linux'
    WINDOWS_10 = 'dos'
    WINDOWS = (
        (WINDOWS_1, 'All'),
        (WINDOWS_2, '95'),
        (WINDOWS_3, '98'),
        (WINDOWS_4, 'NT'),
        (WINDOWS_5, '2000'),
        (WINDOWS_6, 'XP'),
        (WINDOWS_11, 'XP x64'),
        (WINDOWS_12, '7'),
        (WINDOWS_7, 'Vista'),
        (WINDOWS_8, '3.x'),
        (WINDOWS_9, 'Linux'),
        (WINDOWS_10, 'DOS'),
    )

    game = models.ForeignKey('games.Game', models.CASCADE)
    category = models.CharField(choices=CATEGORIES, max_length=5, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    file = models.FileField(blank=True, default=None, null=True, upload_to=file)
    file_size = models.BigIntegerField(default=0)
    windows = ArrayField(models.CharField(max_length=5), blank=True, default=list)
    languages = ArrayField(models.CharField(max_length=2), blank=True, default=list)
    created = models.DateTimeField()

    class Meta:
        ordering = ('-id',)
        verbose_name = 'File'
        verbose_name_plural = 'Files'

    def __str__(self):
        return str(self.id)

    def get_absolute_url(self):
        categories = {
            'demo': 'demos',
            'patch': 'patches',
        }
        return '{}://{}/games/{}/{}/{}'.format(
            settings.SITE_PROTOCOL,
            get_site_by_current_language().name,
            self.game.slug,
            categories[self.category],
            self.id
        )

    @cached_property
    def all_windows_dict(self):
        return dict(self.WINDOWS)


class SoftwareCategory(ProjectModel):
    name = models.CharField(max_length=50)
    slug = CIAutoSlugField(populate_from='name', unique=True)
    description = models.TextField(blank=True, default='')
    parent = models.ForeignKey('self', models.CASCADE, related_name='children', null=True, blank=True, default=None)

    class Meta:
        ordering = ('-id',)
        verbose_name = 'Software Category'
        verbose_name_plural = 'Software Categories'

    def __str__(self):
        return self.name


class Software(ProjectModel):
    UI_1 = 'gui'
    UI_2 = 'console'
    UI_3 = 'both'
    UI_TYPES = (
        (UI_1, 'GUI'),
        (UI_2, 'Console/Command line'),
        (UI_3, 'GUI + Console/Command line'),
    )
    RUS_1 = 'yes'
    RUS_2 = 'plugin'
    RUS_3 = 'no'
    RUS_TYPES = (
        (RUS_1, 'Интегрирован'),
        (RUS_2, 'Плагин на сайте'),
        (RUS_3, 'Отсутствует'),
    )
    TYPE_1 = 'freeware'
    TYPE_2 = 'shareware'
    TYPE_3 = 'demo'
    TYPE_4 = 'fun-limited-demo'
    TYPE_5 = 'time-limited-demo'
    TYPE_6 = 'commercial'
    TYPES = (
        (TYPE_1, 'Freeware'),
        (TYPE_2, 'Shareware'),
        (TYPE_3, 'Demo'),
        (TYPE_4, 'Functions limited demo'),
        (TYPE_5, 'Time limited demo'),
        (TYPE_6, 'Commercial'),
    )
    SYSTEM_1 = 'dos'
    SYSTEM_2 = '95-98'
    SYSTEM_3 = 'nt'
    SYSTEM_4 = '2000'
    SYSTEM_5 = 'xp'
    SYSTEM_6 = 'vista'
    SYSTEM_7 = '7'
    SYSTEMS = (
        (SYSTEM_1, 'DOS'),
        (SYSTEM_2, 'Windows 95/98'),
        (SYSTEM_3, 'Windows NT'),
        (SYSTEM_4, 'Windows 2000'),
        (SYSTEM_5, 'Windows XP'),
        (SYSTEM_6, 'Windows Vista'),
        (SYSTEM_7, 'Windows 7'),
    )

    categories = models.ManyToManyField(SoftwareCategory)
    name = models.CharField(max_length=255)
    version = models.CharField(blank=True, default='', max_length=30)
    description = models.TextField(blank=True, default='')
    price = models.CharField(blank=True, default='', max_length=20)
    developer = models.CharField(blank=True, default='', max_length=100)
    developer_url = models.CharField(blank=True, default='', max_length=250)
    ui = models.CharField(blank=True, default='', choices=UI_TYPES, max_length=7)
    rus = models.CharField(blank=True, default='', choices=RUS_TYPES, max_length=6)
    type = models.CharField(blank=True, default='', choices=TYPES, max_length=17)
    systems = ArrayField(models.CharField(max_length=5), blank=True, default=list)

    class Meta:
        ordering = ('-id',)
        verbose_name = 'Software'
        verbose_name_plural = 'Software'

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return '{}://{}/files/software/{}'.format(settings.SITE_PROTOCOL, get_site_by_current_language().name, self.id)

    @property
    def full_name(self):
        return f'{self.name} {self.version}'.strip()

    @cached_property
    def all_systems_dict(self):
        return dict(self.SYSTEMS)


def software_file(instance, filename):
    return os.path.join('software', str(instance.software_id), filename.lower())


class SoftwareFile(ProjectModel):
    software = models.ForeignKey(Software, models.CASCADE)
    name = models.CharField(max_length=255)
    file = models.FileField(blank=True, default=None, null=True, upload_to=software_file)
    file_size = models.PositiveIntegerField(default=0)
    created = models.DateTimeField()

    class Meta:
        ordering = ('-id',)
        verbose_name = 'Software File'
        verbose_name_plural = 'Software Files'

    def __str__(self):
        return str(self.id)
