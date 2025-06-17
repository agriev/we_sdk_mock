import React from 'react';
import { FormattedMessage } from 'react-intl';

const trans = (id, vals) => <FormattedMessage id={id} values={vals} />;

export default trans;
