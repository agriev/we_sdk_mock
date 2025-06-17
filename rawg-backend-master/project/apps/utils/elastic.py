import logging
from time import time

import elasticsearch
from django.conf import settings
from elasticsearch.helpers import bulk, scan
from haystack.constants import DJANGO_CT, ID
from haystack.exceptions import SkipDocument
from haystack.models import SearchResult
from haystack.query import SearchQuerySet
from haystack.utils import get_identifier, get_model_ct
from haystack_elasticsearch.elasticsearch6 import (
    Elasticsearch6SearchBackend, Elasticsearch6SearchEngine, Elasticsearch6SearchQuery,
)

from apps.utils.strings import convert_numbers_from_roman, normalize_apostrophes, strip_accents

logger = logging.getLogger('haystack')


def log_query(func):
    def wrapper(obj, query_string, *args, **kwargs):
        start = time()
        try:
            return func(obj, query_string, *args, **kwargs)
        finally:
            stop = time()
            if settings.DEBUG:
                from haystack import connections
                connections[obj.connection_alias].queries.append({
                    'query_string': query_string,
                    'additional_args': args,
                    'additional_kwargs': kwargs,
                    'time': "%.3f" % (stop - start),
                    'start': start,
                    'stop': stop,
                })
            if settings.HAYSTACK_LOG:
                logger.info(f'{round(stop - start, 3)} - {query_string} - {args} - {kwargs}')
    return wrapper


class ElasticsearchSearchBackend(Elasticsearch6SearchBackend):
    DEFAULT_SETTINGS = {
        'settings': {
            "analysis": {
                "analyzer": {
                    "ngram_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["haystack_ngram", "lowercase"]
                    },
                    "edgengram_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["haystack_edgengram", "lowercase"]
                    },
                },
                "tokenizer": {
                    "haystack_ngram_tokenizer": {
                        "type": "nGram",
                        "min_gram": 3,
                        "max_gram": 15,
                    },
                    "haystack_edgengram_tokenizer": {
                        "type": "edgeNGram",
                        "min_gram": 1,  # was 2
                        "max_gram": 15,
                        "side": "front"
                    }
                },
                "filter": {
                    "haystack_ngram": {
                        "type": "nGram",
                        "min_gram": 3,
                        "max_gram": 15
                    },
                    "haystack_edgengram": {
                        "type": "edgeNGram",
                        "min_gram": 1,  # was 2
                        "max_gram": 15
                    }
                }
            }
        }
    }

    def more_like_this_params(self, field_name, doc_id, model_instance):
        model = doc_id.split('.')
        model = '{}.{}'.format(model[0], model[1])
        model = settings.MORE_LIKE_THIS.get(model)
        if model:
            model = model(model_instance)
            model['like'] = [{"_id": doc_id}]
            return model
        return {
            'fields': [field_name],
            'like': [{"_id": doc_id}]
        }

    def build_schema(self, fields):
        content_field_name, mapping = super().build_schema(fields)
        for field_name, field_class in fields.items():
            field_mapping = mapping[field_class.index_fieldname]
            if hasattr(field_class, 'analyzer'):
                field_mapping['analyzer'] = field_class.analyzer
            else:
                if hasattr(field_class, 'index_analyzer'):
                    if 'analyzer' in field_mapping:
                        del field_mapping['analyzer']
                    field_mapping['index_analyzer'] = field_class.index_analyzer
                if hasattr(field_class, 'search_analyzer'):
                    field_mapping['search_analyzer'] = field_class.search_analyzer
            if hasattr(field_class, 'index_options'):
                field_mapping['index_options'] = field_class.index_options
            mapping[field_class.index_fieldname] = field_mapping
        return content_field_name, mapping

    @log_query
    def more_like_this(self, model_instance, additional_query_string=None,
                       start_offset=0, end_offset=None, models=None,
                       limit_to_registered_models=None, result_class=None, **kwargs):
        from haystack import connections

        if not self.setup_complete:
            self.setup()

        # Deferred models will have a different class ("RealClass_Deferred_fieldname")
        # which won't be in our registry:
        # noinspection PyProtectedMember
        model_klass = model_instance._meta.concrete_model

        index = connections[self.connection_alias].get_unified_index().get_index(model_klass)
        field_name = index.get_content_field()
        params = {}

        if start_offset is not None:
            params['from_'] = start_offset

        if end_offset is not None:
            params['size'] = end_offset  # - start_offset

        doc_id = get_identifier(model_instance)

        try:
            # More like this Query
            # https://www.elastic.co/guide/en/elasticsearch/reference/2.2/query-dsl-mlt-query.html
            mlt_query = {
                'query': {
                    'more_like_this': self.more_like_this_params(field_name, doc_id, model_instance)
                }
            }

            narrow_queries = []

            if additional_query_string and additional_query_string != '*:*':
                additional_filter = {
                    "query_string": {
                        "query": additional_query_string
                    }
                }
                narrow_queries.append(additional_filter)

            if limit_to_registered_models is None:
                limit_to_registered_models = getattr(settings, 'HAYSTACK_LIMIT_TO_REGISTERED_MODELS', True)

            if models and len(models):
                model_choices = sorted(get_model_ct(model) for model in models)
            elif limit_to_registered_models:
                # Using narrow queries, limit the results to only models handled
                # with the current routers.
                model_choices = self.build_models_list()
            else:
                model_choices = []

            if len(model_choices) > 0:
                model_filter = {"terms": {DJANGO_CT: model_choices}}
                narrow_queries.append(model_filter)

            if len(narrow_queries) > 0:
                mlt_query = {
                    "query": {
                        "bool": {
                            'must': mlt_query['query'],
                            'filter': {
                                'bool': {
                                    'must': list(narrow_queries)
                                }
                            }
                        }
                    }
                }

            raw_results = self.conn.search(
                body=mlt_query,
                index=self.index_name,
                doc_type='modelresult',
                _source=True, **params)
        except elasticsearch.TransportError as e:
            if not self.silently_fail:
                raise

            self.log.error("Failed to fetch More Like This from Elasticsearch for document '%s': %s",
                           doc_id, e, exc_info=True)
            raw_results = {}

        return self._process_results(raw_results, result_class=result_class)

    @log_query
    def search(self, query_string, **kwargs):
        if len(query_string) == 0 and not kwargs.get('custom_query'):
            return {
                'results': [],
                'hits': 0,
            }

        if not self.setup_complete:
            self.setup()

        search_kwargs = self.build_search_kwargs(query_string, **kwargs)
        if search_kwargs.get('custom_query'):
            search_kwargs['query'] = search_kwargs['custom_query']
            del search_kwargs['custom_query']

        order_fields = set()
        for order in search_kwargs.get('sort', []):
            try:
                for key in order.keys():
                    order_fields.add(key)
            except AttributeError:
                pass

        geo_sort = '_geo_distance' in order_fields

        start_offset = kwargs.get('start_offset', 0)
        search_kwargs['from'] = start_offset
        end_offset = kwargs.get('end_offset')
        if end_offset is not None and end_offset > start_offset:
            search_kwargs['size'] = end_offset - start_offset

        try:
            raw_results = self.conn.search(body=search_kwargs,
                                           index=self.index_name,
                                           doc_type='modelresult',
                                           _source=True)
        except elasticsearch.TransportError as e:
            if not self.silently_fail:
                raise

            self.log.error("Failed to query Elasticsearch using '%s': %s", query_string, e, exc_info=True)
            raw_results = {}

        return self._process_results(raw_results,
                                     highlight=kwargs.get('highlight'),
                                     result_class=kwargs.get('result_class', SearchResult),
                                     distance_point=kwargs.get('distance_point'),
                                     geo_sort=geo_sort)

    def clear(self, models=None, commit=True):  # updated bulk size
        """
        Clears the backend of all documents/objects for a collection of models.

        :param models: List or tuple of models to clear.
        :param commit: Not used.
        """
        if models is not None:
            assert isinstance(models, (list, tuple))

        models_to_delete = []
        try:
            if models is None:
                self.conn.indices.delete(index=self.index_name, ignore=404)
                self.setup_complete = False
                self.existing_mapping = {}
                self.content_field_name = None
            else:
                for model in models:
                    models_to_delete.append("%s:%s" % (DJANGO_CT, get_model_ct(model)))

                # Delete using scroll API
                query = {'query': {'query_string': {'query': " OR ".join(models_to_delete)}}}
                generator = scan(self.conn, query=query, index=self.index_name, doc_type='modelresult')
                actions = ({
                    '_op_type': 'delete',
                    '_id': doc['_id'],
                } for doc in generator)
                bulk(self.conn, actions=actions, index=self.index_name, doc_type='modelresult',
                     **settings.ELASTIC_BULK)
                self.conn.indices.refresh(index=self.index_name)

        except elasticsearch.TransportError as e:
            if not self.silently_fail:
                raise

            if models is not None:
                self.log.error("Failed to clear Elasticsearch index of models '%s': %s",
                               ','.join(models_to_delete), e, exc_info=True)
            else:
                self.log.error("Failed to clear Elasticsearch index: %s", e, exc_info=True)

    def update(self, index, iterable, commit=True):  # updated bulk size
        if not self.setup_complete:
            try:
                self.setup()
            except elasticsearch.TransportError as e:
                if not self.silently_fail:
                    raise

                self.log.error("Failed to add documents to Elasticsearch: %s", e, exc_info=True)
                return

        prepped_docs = []

        for obj in iterable:
            try:
                prepped_data = index.full_prepare(obj)
                final_data = {}

                # Convert the data to make sure it's happy.
                for key, value in prepped_data.items():
                    final_data[key] = self._from_python(value)
                final_data['_id'] = final_data[ID]

                prepped_docs.append(final_data)
            except SkipDocument:
                self.log.debug(u"Indexing for object `%s` skipped", obj)
            except elasticsearch.TransportError as e:
                if not self.silently_fail:
                    raise

                # We'll log the object identifier but won't include the actual object
                # to avoid the possibility of that generating encoding errors while
                # processing the log message:
                self.log.error(u"%s while preparing object for update" % e.__class__.__name__, exc_info=True,
                               extra={"data": {"index": index,
                                               "object": get_identifier(obj)}})

        bulk(self.conn, prepped_docs, index=self.index_name, doc_type='modelresult', **settings.ELASTIC_BULK)

        if commit:
            self.conn.indices.refresh(index=self.index_name)


class ElasticsearchSearchQuery(Elasticsearch6SearchQuery):
    custom_query = None

    def build_params(self, spelling_query=None, **kwargs):
        result = super().build_params(spelling_query, **kwargs)
        if self.custom_query:
            result['custom_query'] = self.custom_query
        return result

    def _clone(self, klass=None, using=None):
        result = super()._clone(klass, using)
        result.custom_query = self.custom_query
        return result

    def add_custom_query(self, custom_query=None, order_by=None, facets=None, start_offset=None, end_offset=None):
        self.custom_query = custom_query
        if order_by:
            self.order_by = order_by
        if facets:
            self.facets = facets
        if start_offset:
            self.start_offset = start_offset
        if end_offset:
            self.end_offset = end_offset


class ConfigurableSearchQuerySet(SearchQuerySet):
    def custom_query(self, custom_query, order_by=None, facets=None, start_offset=None, end_offset=None):
        clone = self._clone()
        clone.query.add_custom_query(custom_query, order_by, facets, start_offset, end_offset)
        return clone


class ElasticsearchSearchEngine(Elasticsearch6SearchEngine):
    backend = ElasticsearchSearchBackend
    query = ElasticsearchSearchQuery


def prepare_search(name, in_elastic=False, convert_roman=True):
    name = name.strip().lower()
    if not in_elastic:
        name = name.replace('&', 'and')
    if convert_roman:
        name = convert_numbers_from_roman(name)
    name = normalize_apostrophes(name).replace("'", '')
    return strip_accents(name)


def auto_synonyms(name):
    data = [
        name.replace('-', ' '),
        name.replace('.', ''),
        name.replace(':', ''),
        normalize_apostrophes(name).replace('\'s', ''),
    ]
    return map(prepare_search, data)
