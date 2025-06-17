import PropTypes from 'prop-types';

export const MODE_SELECTOR_COLUMNS = 'columns';
export const MODE_SELECTOR_LIST = 'list';

export const modeSelectorType = PropTypes.oneOf([MODE_SELECTOR_LIST, MODE_SELECTOR_COLUMNS]);
