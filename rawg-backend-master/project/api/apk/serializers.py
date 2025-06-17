from rest_framework import serializers


class APKSerializer(serializers.Serializer):
    version = serializers.CharField(read_only=True)
    app_file = serializers.FileField(read_only=True)
    created = serializers.DateTimeField(read_only=True)
