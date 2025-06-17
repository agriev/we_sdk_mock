from django.contrib import admin
from django.utils.safestring import mark_safe

from apps.shop import models
from apps.utils.admin import get_preview
from apps.utils.adminsortable2 import SortableAdminMixin


class ProductImageInline(admin.TabularInline):
    model = models.ProductImage
    extra = 0


class ProductCodeInline(admin.TabularInline):
    model = models.ProductCode
    extra = 0


@admin.register(models.Product)
class ProductAdmin(SortableAdminMixin, admin.ModelAdmin):
    list_display = ('id', 'name', 'price', 'preview', 'created')
    list_display_links = list_display
    inlines = [
        ProductImageInline,
        ProductCodeInline,
    ]

    def preview(self, instance):
        return mark_safe(get_preview(instance.image, 150))


@admin.register(models.Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')


@admin.register(models.ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('product', 'preview')

    def preview(self, instance):
        return mark_safe(get_preview(instance.image, 150))


@admin.register(models.ProductCode)
class ProductCodeAdmin(admin.ModelAdmin):
    list_display = ('product', 'code', 'active')
    list_display_links = list_display


@admin.register(models.UserProduct)
class UserProductAdmin(admin.ModelAdmin):

    def secret_code(self, obj):
        return obj.code.code

    list_display = ('id', 'user', 'product', 'secret_code', 'created', 'price')
    fields = ('id', 'user', 'product', 'secret_code', 'created', 'price')
    readonly_fields = list_display
    list_display_links = list_display
    raw_id_fields = ('user', 'product')
