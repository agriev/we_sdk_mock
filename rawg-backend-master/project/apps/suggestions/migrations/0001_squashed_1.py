import django.contrib.postgres.fields
import django.contrib.postgres.indexes
import django.db.models.deletion
import select2.fields
from django.db import migrations, models

import apps.utils.fields.autoslug


class Migration(migrations.Migration):
    replaces = [('suggestions', '0001_squashed'), ('suggestions', '0002_suggestion_limit'),
                ('suggestions', '0003_auto_20181205_1005'), ('suggestions', '0004_remove_suggestionfilters_category')]

    initial = True

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('games', '__first__'),
        ('credits', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='Suggestion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(db_index=True, editable=False)),
                ('title', models.CharField(max_length=100)),
                ('slug',
                 apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='title', unique=True)),
                ('description', models.CharField(max_length=1000)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(default=None, null=True)),
                ('top_games',
                 django.contrib.postgres.fields.ArrayField(base_field=models.PositiveIntegerField(), default=list,
                                                           editable=False, size=None)),
                ('games_count', models.PositiveIntegerField(default=0, editable=False)),
            ],
            options={
                'verbose_name': 'Suggestion',
                'verbose_name_plural': 'Suggestions',
                'ordering': ('order',),
            },
        ),
        migrations.CreateModel(
            name='SuggestionFilters',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('object_id', models.PositiveIntegerField(default=0, editable=False)),
                ('content_type',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='contenttypes.ContentType')),
                ('suggestion',
                 models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='suggestions.Suggestion')),
            ],
            options={
                'verbose_name': 'Suggestion Filter',
                'verbose_name_plural': 'Suggestion Filters',
            },
        ),
        migrations.AddIndex(
            model_name='suggestion',
            index=django.contrib.postgres.indexes.BrinIndex(fields=['created'],
                                                            name='suggestions_created_183c93_brin'),
        ),
        migrations.RemoveField(
            model_name='suggestionfilters',
            name='object_id',
        ),
        migrations.AddField(
            model_name='suggestion',
            name='image',
            field=models.URLField(default=None, null=True),
        ),
        migrations.RenameField(
            model_name='suggestion',
            old_name='title',
            new_name='name',
        ),
        migrations.AlterField(
            model_name='suggestion',
            name='slug',
            field=apps.utils.fields.autoslug.CIAutoSlugField(editable=False, populate_from='name', unique=True),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='from_date',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='from_now',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='ordering',
            field=models.CharField(blank=True,
                                   choices=[('added', 'Popularity: Ascending'), ('-added', 'Popularity: Descending'),
                                            ('released', 'Released: Ascending'), ('-released', 'Released: Descending'),
                                            ('name', 'Name: Ascending'), ('-name', 'Name: Descending'),
                                            ('created', 'Date Added: Ascending'),
                                            ('-created', 'Date Added: Descending'),
                                            ('rating', 'Rating: Ascending'), ('-rating', 'Rating: Descending')],
                                   max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='released_only',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='to_date',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='to_now',
            field=models.BooleanField(default=False),
        ),
        migrations.RemoveField(
            model_name='suggestionfilters',
            name='content_type',
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='developer',
            field=select2.fields.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                            on_delete=django.db.models.deletion.CASCADE, to='games.Developer'),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='genre',
            field=select2.fields.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                            on_delete=django.db.models.deletion.CASCADE, to='games.Genre'),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='person',
            field=select2.fields.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                            on_delete=django.db.models.deletion.CASCADE, to='credits.Person'),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='platform',
            field=select2.fields.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                            on_delete=django.db.models.deletion.CASCADE, to='games.Platform'),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='platformparent',
            field=select2.fields.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                            on_delete=django.db.models.deletion.CASCADE, to='games.PlatformParent'),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='publisher',
            field=select2.fields.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                            on_delete=django.db.models.deletion.CASCADE, to='games.Publisher'),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='store',
            field=select2.fields.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                            on_delete=django.db.models.deletion.CASCADE, to='games.Store'),
        ),
        migrations.AddField(
            model_name='suggestionfilters',
            name='tag',
            field=select2.fields.ForeignKey(blank=True, db_index=False, default=None, null=True,
                                            on_delete=django.db.models.deletion.CASCADE, to='games.Tag'),
        ),
        migrations.AlterField(
            model_name='suggestion',
            name='description',
            field=models.CharField(blank=True, max_length=1000, null=True),
        ),
        migrations.AddField(
            model_name='suggestion',
            name='limit',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='suggestion',
            name='related_tags',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.PositiveIntegerField(), default=list,
                                                            editable=False, size=None),
        ),
        migrations.AlterField(
            model_name='suggestion',
            name='order',
            field=models.PositiveIntegerField(db_index=True, editable=False, verbose_name='order'),
        ),
    ]
