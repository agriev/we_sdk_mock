from rest_framework import serializers

from apps.shop import models


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Category
        ref_name = 'ShopCategory'
        fields = ('id', 'name', 'slug')


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ProductImage
        fields = ('image',)


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True)
    category = CategorySerializer()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.image:
            image_obj = models.ProductImage()
            image_obj.image = instance.image
            data['images'] = [ProductImageSerializer(image_obj, context=self.context).data] + data['images']
        return data

    class Meta:
        model = models.Product
        fields = (
            'id',
            'name',
            'slug',
            'price',
            'conditions',
            'description',
            'link',
            'created',
            'edited',
            'images',
            'category',
        )
        read_only_fields = fields


class UserProductSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source='code.code')
    product_id = serializers.IntegerField()

    class Meta:
        model = models.UserProduct
        fields = ('user_id', 'product_id', 'created', 'code', 'price')
