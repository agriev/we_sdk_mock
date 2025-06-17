import csv
from io import StringIO
from typing import Type

from django.db import connection
from django.db.models import ForeignObject, Func, Model, QuerySet
from django.db.models.options import Options
from django.db.models.sql.datastructures import Join
from psycopg2 import sql


def copy_to(model, columns):
    stream = StringIO()
    with connection.cursor() as cursor:
        cursor.copy_to(
            file=stream,
            table=model._meta.db_table,
            sep=',',
            columns=columns,
        )
    return stream


def copy_from(model, columns, records):
    stream = StringIO()
    writer = csv.writer(stream)
    for record in records:
        writer.writerow(record)
    stream.seek(0)
    with connection.cursor() as cursor:
        cursor.copy_from(
            file=stream,
            table=model._meta.db_table,
            sep=',',
            columns=columns,
        )


def copy_from_conflict(model, table_columns, records, on_conflict, tmp_table_name, table_name='', join=''):
    stream = StringIO()
    writer = csv.writer(stream)
    for record in records:
        writer.writerow(record)
    stream.seek(0)
    columns = sql.SQL(', ').join([sql.Identifier(c) for c in table_columns])
    tmp_name = sql.Identifier(tmp_table_name)
    name = sql.Identifier(model._meta.db_table if model else table_name)
    tmp = sql.SQL('CREATE TEMP TABLE {} ON COMMIT DROP AS SELECT * FROM {} WITH NO DATA').format(tmp_name, name)
    cp = sql.SQL('COPY {} ({}) FROM STDIN WITH CSV').format(tmp_name, columns)
    ins = sql.SQL('INSERT INTO {} AS a ({}) SELECT {} FROM {} {} ON CONFLICT {}').format(
        name,
        columns,
        sql.SQL(', ').join([sql.Identifier(tmp_table_name, c) for c in table_columns]),
        tmp_name,
        sql.SQL(join),
        sql.SQL(on_conflict)
    )
    with connection.cursor() as cursor:
        cursor.execute(tmp)
        cursor.copy_expert(cp, stream)
        cursor.execute(ins)


def join(
    queryset: QuerySet, model_from: Type[Model], model_to: Type[Model],
    field_from: str, field_to: str, join_type: str = 'LOUTER'
) -> None:
    foreign_obj = ForeignObject(
        to=model_to,
        on_delete=lambda: None,
        from_fields=[None],
        to_fields=[None],
        rel=None,
        related_name=None
    )
    foreign_obj.opts = Options(model_from._meta)
    foreign_obj.opts.model = model_from
    foreign_obj.get_joining_columns = lambda: ((field_from, field_to),)
    join_obj = Join(
        model_to._meta.db_table,
        model_from._meta.db_table,
        'T1', join_type, foreign_obj, True
    )
    queryset.query.join(join_obj, None)


class Cast(Func):
    function = 'CAST'

    def as_postgresql(self, compiler, connection, **extra_context):
        return super().as_sql(
            compiler, connection,
            function='CAST',
            template="%(function)s(%(expressions)s AS %(type)s)",
            **extra_context
        )
