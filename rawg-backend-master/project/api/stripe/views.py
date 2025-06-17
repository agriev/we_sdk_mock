import logging

import stripe
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.db import transaction
from django.utils.timezone import now
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.stat.models import APIUserCounter
from apps.stripe.models import Payment
from apps.users.models import User
from apps.utils.lang import get_site_by_current_language

logger_info = logging.getLogger('info')
logger = logging.getLogger(__name__)


class StripeCreateCheckoutSessionView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        stripe.api_key = settings.STRIPE_API_KEY
        domain = get_site_by_current_language().name
        if request.user.stripe_customer_id:
            if len(stripe.Subscription.list(limit=1, customer=request.user.stripe_customer_id, status='active').data):
                return Response(
                    data={'error': {'message': 'You have an active subscription'}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            kwargs = {'customer': request.user.stripe_customer_id}
        else:
            kwargs = {'customer_email': request.user.real_email}
        try:
            checkout_session = stripe.checkout.Session.create(
                success_url=f'https://{domain}/api-purchase-success?session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'https://{domain}/apidocs',
                payment_method_types=['card'],
                mode='subscription',
                line_items=[
                    {
                        'price': settings.STRIPE_PRICE_ID,
                        'quantity': 1,
                    },
                ],
                client_reference_id=request.user.id,
                **kwargs,
            )
            return Response(data={'sessionId': checkout_session['id']}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(data={'error': {'message': str(e)}}, status=status.HTTP_400_BAD_REQUEST)


class StripeCheckoutSessionView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        stripe.api_key = settings.STRIPE_API_KEY
        try:
            checkout_session = stripe.checkout.Session.retrieve(request.GET.get('sessionId'))
            return Response(data=checkout_session, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(data={'error': {'message': str(e)}}, status=status.HTTP_400_BAD_REQUEST)


class StripeCustomerPortalView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        stripe.api_key = settings.STRIPE_API_KEY
        try:
            domain = get_site_by_current_language().name
            session = stripe.billing_portal.Session.create(
                customer=request.user.stripe_customer_id,
                return_url=f'https://{domain}/@{request.user.slug}/apikey',
            )
            return Response(data={'url': session.url}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(data={'error': {'message': str(e)}}, status=status.HTTP_400_BAD_REQUEST)


class StripeWebhookView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        stripe.api_key = settings.STRIPE_API_KEY
        payload = request.body
        sig_header = request.META['HTTP_STRIPE_SIGNATURE']
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_ENDPOINT_SECRET)
        except (ValueError, stripe.error.SignatureVerificationError):
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if event.type == 'checkout.session.completed':
            try:
                user = User.objects.get(id=event.data.object.client_reference_id)
            except User.DoesNotExist:
                logger.warning(
                    'Stripe User Does Not Found (user: %s, event: %s)',
                    event.data.object.client_reference_id,
                    event.type,
                )
                return Response(status=status.HTTP_200_OK)
            user.stripe_customer_id = event.data.object.customer
            user.save(update_fields=['stripe_customer_id'])
        elif event.type == 'invoice.paid':
            try:
                user = User.objects.get(stripe_customer_id=event.data.object.customer)
            except User.DoesNotExist:
                try:
                    user = User.objects.get(email=event.data.object.customer_email)
                    user.stripe_customer_id = event.data.object.customer
                    user.save(update_fields=['stripe_customer_id'])
                except User.DoesNotExist:
                    logger.warning(
                        'Stripe User Does Not Found (user: %s, email: %s, event: %s)',
                        event.data.object.customer,
                        event.data.object.customer_email,
                        event.type,
                    )
                    return Response(status=status.HTTP_502_BAD_GATEWAY)
            self.save_payment(user, event.data.object.lines.data[0].subscription, event.data.object.id)
        elif event.type == 'invoice.payment_failed':
            try:
                user = User.objects.get(stripe_customer_id=event.data.object.customer)
            except User.DoesNotExist:
                user = None
            logger_info.info(
                'Stripe Payment Failed (user: %s, customer: %s, event: %s)',
                user.id if user else None,
                event.data.object.customer,
                event.type,
            )

        return Response(status=status.HTTP_200_OK)

    def save_payment(self, user, subscription_id, invoice_id):
        user.api_group = settings.API_GROUP_BUSINESS
        with transaction.atomic():
            user.save()
            _, created = Payment.objects.get_or_create(
                user=user,
                api_group=settings.API_GROUP_BUSINESS,
                subscription_id=subscription_id,
                invoice_id=invoice_id,
                defaults={'until_date': now() + relativedelta(months=1)},
            )
            if created:
                APIUserCounter.objects.filter(user_id=user.id, date=now()).update(count=0)
