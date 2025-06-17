from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Payment
from .serializers import PaymentSerializer

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Payment.objects.filter(user=self.request.user)
        return Payment.objects.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save(user=request.user if request.user.is_authenticated else None)
        # Fake payment processing
        payment.status = 'success'
        payment.transaction_id = f"TEST-{payment.id}"
        payment.save()
        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(payment).data, status=status.HTTP_201_CREATED, headers=headers) 