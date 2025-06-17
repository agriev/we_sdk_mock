import logging

from transitions import Machine

logger = logging.getLogger('payment')


class PaymentException(Exception):
    def __init__(self, dest, message, data=None):
        self.dest = dest
        self.message = message
        self.data = data

    def to_dict(self):
        return dict(dest=self.dest, message=self.message, data=self.data)


class Constants:
    INITIAL = 'initial'
    CREATED = 'created'  # received a request from the game for payment
    PENDING = 'pending'  # waiting for confirmation of payment from the payment system
    PAID = 'paid'  # received confirmation from the payment system
    PAYMENT_CONFIRMED = 'payment_confirmed'  # received confirmation from the game (optional)
    REFUNDED = 'refunded'  # the payment system reported a refund of the payment
    REFUND_CONFIRMED = 'refund_confirmed'  # received confirmation from the game (optional)
    CANCELED = 'canceled'  # payment was canceled during the payment process (ukassa only: payment token has expired)
    ERROR = 'error'

    STATES = [INITIAL, CREATED, PENDING, PAID, PAYMENT_CONFIRMED, REFUNDED, REFUND_CONFIRMED, CANCELED, ERROR]

    TRANSITIONS = [
        {'trigger': f'change_to_{CREATED}', 'source': INITIAL, 'dest': CREATED},
        {'trigger': f'change_to_{PENDING}', 'source': [CREATED, PENDING], 'dest': PENDING},
        {'trigger': f'change_to_{CANCELED}', 'source': PENDING, 'dest': CANCELED},
        {'trigger': f'change_to_{PAID}', 'source': [CANCELED, PENDING, PAID], 'dest': PAID},
        {'trigger': f'change_to_{PAYMENT_CONFIRMED}', 'source': [PAID, PAYMENT_CONFIRMED], 'dest': PAYMENT_CONFIRMED},
        {
            'trigger': f'change_to_{REFUNDED}',
            'source': [CANCELED, PENDING, PAID, PAYMENT_CONFIRMED, REFUNDED],
            'dest': REFUNDED
        },
        {'trigger': f'change_to_{REFUND_CONFIRMED}', 'source': [REFUNDED, REFUND_CONFIRMED], 'dest': REFUND_CONFIRMED},
        {'trigger': f'change_to_{ERROR}', 'source': '*', 'dest': ERROR},
    ]

    STATES_CHOICES = [
        (INITIAL, 'initial state'),
        (CREATED, 'game requested a token'),
        (PENDING, 'pending player payment'),
        (CANCELED, 'payment token expired'),
        (PAID, 'paid'),
        (PAYMENT_CONFIRMED, 'game confirmed payment'),
        (REFUNDED, 'refunded'),
        (REFUND_CONFIRMED, 'refund confirmed'),
        (ERROR, 'error')
    ]


class PaymentStateMachineMixin(Machine):
    def __init__(self, *args, **kwargs):
        Machine.__init__(
            self,
            states=Constants.STATES,
            transitions=Constants.TRANSITIONS,
            initial=Constants.INITIAL,
            send_event=True,
            on_exception=self.handle_exception,
            before_state_change=self.action_before_change,
            after_state_change=self.action_after_change,
            auto_transitions=False,
        )

    def action_before_change(self, event):
        event.kwargs['event_instance'].action_before_change(event)

    def action_after_change(self, event):
        event.kwargs['event_instance'].action_after_change(event)

    def handle_exception(self, event):
        logger.error(f'Status change error. ID: {self.id}, error: {event.error}')
        event.kwargs['event_instance'].on_exception(event)
