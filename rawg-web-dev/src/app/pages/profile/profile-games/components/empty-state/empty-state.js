import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { FormattedHTMLMessage } from 'react-intl';

import paths from 'config/paths';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import Button from 'app/ui/button';

const propTypes = {
  isCurrentUser: PropTypes.bool.isRequired,
};

const EmptyState = ({ isCurrentUser }) =>
  isCurrentUser ? (
    <div>
      <p className="profile__text">
        <FormattedHTMLMessage id="profile.personal_no_games" />
      </p>
      <Link className="profile__link" to={paths.search()} href={paths.search()}>
        <Button kind="fill" size="medium">
          <SimpleIntlMessage id="profile.add_games" />
        </Button>
      </Link>
    </div>
  ) : (
    <div>
      <p className="profile__text">
        <FormattedHTMLMessage id="profile.no_games" />
      </p>
    </div>
  );

EmptyState.propTypes = propTypes;

export default EmptyState;
