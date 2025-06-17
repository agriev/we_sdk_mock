from adminsortable2.admin import SortableAdminMixin as DefaultSortableAdminMixin
from django.db import router, transaction
from django.db.models import F
from django.db.models.signals import post_save, pre_save


class SortableAdminMixin(DefaultSortableAdminMixin):
    def _move_item(self, request, startorder, endorder):
        if self._get_order_direction(request) != '-1':
            order_up, order_down = 0, 1
        else:
            order_up, order_down = 1, 0
        if startorder < endorder - order_up:
            finalorder = endorder - order_up
            move_filter = {
                '{0}__gte'.format(self.default_order_field): startorder,
                '{0}__lte'.format(self.default_order_field): finalorder,
            }
            order_by = self.default_order_field
            move_update = {self.default_order_field: F(self.default_order_field) - 1}
        elif startorder > endorder + order_down:
            finalorder = endorder + order_down
            move_filter = {
                '{0}__gte'.format(self.default_order_field): finalorder,
                '{0}__lte'.format(self.default_order_field): startorder,
            }
            order_by = '-{0}'.format(self.default_order_field)
            move_update = {self.default_order_field: F(self.default_order_field) + 1}
        else:
            return self.model.objects.none()
        with transaction.atomic():
            extra_model_filters = self.get_extra_model_filters(request)
            filters = {self.default_order_field: startorder}
            filters.update(extra_model_filters)
            move_filter.update(extra_model_filters)
            try:
                obj = self.model.objects.get(**filters)
            except self.model.MultipleObjectsReturned:
                msg = "Detected non-unique values in field '{}' used for sorting this model.\nConsider to run \n"\
                      "    python manage.py reorder {}\n"\
                      "to adjust this inconsistency."
                raise self.model.MultipleObjectsReturned(msg.format(self.default_order_field, self.model._meta.label))

            # changes: add select_for_update
            obj_qs = self.model.objects.select_for_update().filter(pk=obj.pk)
            move_qs = self.model.objects.select_for_update().filter(**move_filter).order_by(order_by)
            # end changes

            for instance in move_qs:
                pre_save.send(
                    self.model,
                    instance=instance,
                    update_fields=[self.default_order_field],
                    raw=False,
                    using=None or router.db_for_write(
                        self.model,
                        instance=instance),
                )
            # using qs.update avoid multi [pre|post]_save signal on obj.save()
            obj_qs.update(**{self.default_order_field: self.get_max_order(request, obj) + 1})
            move_qs.update(**move_update)
            obj_qs.update(**{self.default_order_field: finalorder})
            for instance in move_qs:
                post_save.send(
                    self.model,
                    instance=instance,
                    update_fields=[self.default_order_field],
                    raw=False,
                    using=router.db_for_write(self.model, instance=instance),
                    created=False
                )
        query_set = self.model.objects.filter(**move_filter).order_by(self.default_order_field) \
            .values_list('pk', self.default_order_field)
        return [dict(pk=pk, order=order) for pk, order in query_set]
