import React from 'react';
import PropTypes from 'prop-types';

import Heading from 'app/ui/heading';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import './profile-title.styl';

const propTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['large', 'small']),
  centred: PropTypes.bool,
};

const defaultProps = {
  type: 'small',
  centred: false,
};

const ProfileTitle = ({ id, type, centred }) => (
  <Heading className="profile-title" rank={3} looksLike={type === 'large' ? 2 : 3} centred={centred} withMobileOffset>
    <SimpleIntlMessage id={id} />
  </Heading>
);

ProfileTitle.propTypes = propTypes;
ProfileTitle.defaultProps = defaultProps;

export default ProfileTitle;
