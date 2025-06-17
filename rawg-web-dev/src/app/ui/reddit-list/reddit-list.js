import React from 'react';
import PropTypes from 'prop-types';
import { pure } from 'recompose';
import { Element } from 'react-scroll';

import chunk from 'lodash/chunk';

import SectionHeading from 'app/ui/section-heading';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import RedditCard from 'app/ui/reddit-card';
import ViewAllButton from 'app/ui/view-all-link';

import redditLogo from 'assets/icons/reddit-logo.png';

import { redditResult } from 'app/pages/game/game.types';

import './reddit-list.styl';

const propTypes = {
  titleLink: PropTypes.string,
  count: PropTypes.number,
  results: PropTypes.arrayOf(redditResult),
  displayNum: PropTypes.number,
  messageId: PropTypes.string,
  size: PropTypes.oneOf(['desktop', 'phone']),
  name: PropTypes.string.isRequired,
};

const defaultProps = {
  titleLink: '',
  count: 0,
  results: [],
  displayNum: 6,
  messageId: 'game.reddit_title',
  size: 'desktop',
};

const RedditList = ({ titleLink, count, results, displayNum, messageId, size, name }) => {
  const countNode = count !== 0 ? <SimpleIntlMessage id="game.reddit_count" values={{ count }} /> : null;
  return (
    <div className="game__reddit reddit-list">
      <Element name="reddit" />
      <SectionHeading
        url={titleLink}
        heading={<SimpleIntlMessage id={messageId} values={{ name }} />}
        image={{
          src: redditLogo,
          alt: 'Reddit',
        }}
        count={countNode}
      />
      {chunk(results.slice(0, displayNum), 3).map((postChunks) => (
        <div key={postChunks.map((p) => p.id).join(',')} className="reddit-list__content">
          {postChunks.map((post) => (
            <RedditCard showText={false} className="reddit-list__item" post={post} key={post.id} size={size} />
          ))}
        </div>
      ))}

      {count > 6 && <ViewAllButton path={titleLink} position="right" />}
    </div>
  );
};

RedditList.propTypes = propTypes;
RedditList.defaultProps = defaultProps;

export default pure(RedditList);
