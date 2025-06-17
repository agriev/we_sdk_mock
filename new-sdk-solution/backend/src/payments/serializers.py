from rest_framework import serializers
from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'game', 'amount', 'currency', 'status', 'transaction_id', 'created']
        read_only_fields = ['status', 'transaction_id', 'created'] 