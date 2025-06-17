import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';

import paths from 'config/paths';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import gratsIcon from 'assets/icons/emoji/grats.png';
import Sharing from 'app/components/sharing';

import './all-rated.styl';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  className: PropTypes.string,
  userSlug: PropTypes.string.isRequired,
  ratedText: PropTypes.string,
};

const defaultProps = {
  className: '',
  ratedText: undefined,
};

const AllRatedComponent = ({ className, userSlug, ratedText }) => (
  <div className={['all-rated', className].join(' ')}>
    <SimpleIntlMessage id="profile.all_games_combo" />
    <br />
    {ratedText || <SimpleIntlMessage id="profile.all_games_rated" />}
    <img src={gratsIcon} alt="All games rated!" />
    <div className="all-rated__share">
      <FormattedMessage
        id="profile.rate_games_share"
        values={{
          facebook: (
            <Sharing url={paths.profile(userSlug)} provider="facebook" className="all-rated__share-link">
              <SimpleIntlMessage id="profile.rate_games_share_fb" />
            </Sharing>
          ),
          twitter: (
            <Sharing url={paths.profile(userSlug)} provider="twitter" className="all-rated__share-link">
              <SimpleIntlMessage id="profile.rate_games_share_tw" />
            </Sharing>
          ),
          profile: (
            <Link to={paths.profile(userSlug)} href={paths.profile(userSlug)}>
              <SimpleIntlMessage id="profile.rate_games_link" />
            </Link>
          ),
        }}
      />
    </div>
  </div>
);

AllRatedComponent.propTypes = componentPropertyTypes;
AllRatedComponent.defaultProps = defaultProps;

const AllRated = hoc(AllRatedComponent);

export default AllRated;
