import PropTypes from 'prop-types';

import { NOTIF_STATUS_SUCCESS, NOTIF_STATUS_ERROR } from 'app/pages/app/components/notifications/notifications.actions';

const notificationsType = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.string,
    message: PropTypes.node,
    status: PropTypes.oneOf([NOTIF_STATUS_SUCCESS, NOTIF_STATUS_ERROR]),
    custom: PropTypes.bool,
    local: PropTypes.bool,
    authenticated: PropTypes.bool,
    fixed: PropTypes.bool,
    expires: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    notifyPusher: PropTypes.bool,
    weight: PropTypes.number,
  }),
);

export default notificationsType;
