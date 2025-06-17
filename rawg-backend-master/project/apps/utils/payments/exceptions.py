class PaymentSystemError(Exception):
    pass


class PaymentProjectNotConfigured(PaymentSystemError):
    pass


class PaymentSystemNameNotRegistered(PaymentSystemError):
    pass


class InvalidCurrency(PaymentSystemError):
    pass


class InvalidPaymentSystemResponse(PaymentSystemError):
    def __init__(self, description):
        self.description = description


class PaymentNotFound(PaymentSystemError):
    def __init__(self, description):
        self.description = description
