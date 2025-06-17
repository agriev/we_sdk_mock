import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import LabeledIcon from './labeled-icon';

const propTypes = {
  path: PropTypes.string.isRequired,
  intlId: PropTypes.string.isRequired,
  iconClassName: PropTypes.string,
  onClick: PropTypes.func,
};

const defaultProps = {
  iconClassName: null,
};

const LabeledIconLink = ({ path, intlId, iconClassName, onClick }) =>
  onClick ? (
    <a className="header-menu__labeled-icon" onClick={onClick} href={path}>
      <LabeledIcon iconClassName={iconClassName} label={<SimpleIntlMessage id={intlId} />} />
    </a>
  ) : (
    <Link className="header-menu__labeled-icon" to={path} href={path}>
      <LabeledIcon iconClassName={iconClassName} label={<SimpleIntlMessage id={intlId} />} />
    </Link>
  );

LabeledIconLink.propTypes = propTypes;
LabeledIconLink.defaultProps = defaultProps;

export default LabeledIconLink;
