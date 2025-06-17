import React from 'react';
import PropTypes from 'prop-types';
import { pure } from 'recompose';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import chunk from 'lodash/chunk';

import AmpRedditCard from 'app/pages/amp/shared/amp-reddit-card';
// import arrowRight from 'assets/icons/arrow-right.svg';

import { redditResult } from 'app/pages/game/game.types';

const propTypes = {
  titleLink: PropTypes.string,
  count: PropTypes.number,
  results: PropTypes.arrayOf(redditResult),
  displayNum: PropTypes.number,
  messageId: PropTypes.string,
  size: PropTypes.oneOf(['desktop', 'phone']),
};

const defaultProps = {
  titleLink: '',
  count: 0,
  results: [],
  displayNum: 6,
  messageId: 'game.reddit',
  size: 'desktop',
};

const AmpReddit = ({ titleLink, count, results, displayNum, messageId, size }) => {
  const titleNode = (
    <div className="reddit-list__title">
      <FormattedMessage id={messageId} />
      <div className="amp-reddit__title-icon game__block-title-icon" />
      {/* <img className="reddit-list__icon" alt="Reddit" src={redditLogo} /> */}
    </div>
  );
  const countNode = count !== 0 ? <FormattedMessage id="game.reddit_count" values={{ count }} /> : null;
  return (
    <div className="game__reddit">
      {titleLink !== '' ? (
        <div className="reddit-list__title-and-count">
          <Link to={titleLink} href={titleLink}>
            {titleNode}
          </Link>
          <Link className="reddit-list__count" to={titleLink} href={titleLink}>
            {countNode}
          </Link>
        </div>
      ) : (
        <div className="reddit-list__title-and-count">
          <div>{titleNode}</div>
          <div className="reddit-list__count">{countNode}</div>
        </div>
      )}

      {chunk(results.slice(0, displayNum), 3).map((postChunks) => (
        <div key={postChunks.map((p) => p.id).join(',')} className="reddit-list__content">
          {postChunks.map((post) => (
            <AmpRedditCard showText={false} className="reddit-list__item" post={post} key={post.id} size={size} />
          ))}
        </div>
      ))}

      {count > 6 && (
        <div className="reddit-list__view-all-link__container">
          <Link className="reddit-list__view-all-link" to={titleLink} href={titleLink}>
            <FormattedMessage id="game.view_all" />
            {/* <SVGInline className="reddit-list__view-all-icon" svg={arrowRight} /> */}
            <div className="amp-twitch__title-icon game__block-title-icon" />
          </Link>
        </div>
      )}
    </div>
  );
};

AmpReddit.propTypes = propTypes;
AmpReddit.defaultProps = defaultProps;

export default pure(AmpReddit);
