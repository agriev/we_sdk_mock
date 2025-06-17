import React from 'react';
import PropTypes from 'prop-types';
import { pure } from 'recompose';
import { Element } from 'react-scroll';
import { FormattedMessage } from 'react-intl';

import SectionHeading from 'app/ui/section-heading';

import twitchLogo from 'assets/icons/twitch-logo.png';

import VideoCard from 'app/ui/video-card';
import ViewAll from 'app/ui/vew-all';
import paths from 'config/paths';
import { slug as slugType, twitch as twitchType } from 'app/pages/game/game.types';

const componentPropertyTypes = {
  slug: slugType,
  name: PropTypes.string.isRequired,
  twitch: twitchType,
  openViewer: PropTypes.func.isRequired,
};

const componentDefaultProperties = {
  slug: '',
  twitch: {
    results: [],
    count: 0,
  },
};

const GameTwitchBlock = ({ slug, twitch, openViewer, name }) => {
  const { results, count } = twitch;

  if (results.length === 0) return null;

  return (
    <div className="game__twitch">
      <Element name="twitch" />
      <SectionHeading
        url={paths.gameTwitch(slug)}
        heading={<FormattedMessage id="game.twitch_title" values={{ name }} />}
        image={{
          src: twitchLogo,
          alt: 'Twitch',
        }}
        count={<FormattedMessage id="game.twitch_count" values={{ count }} />}
      />
      <div className="game__twitch-content">
        {results.slice(0, 3).map((video, index) => (
          <VideoCard
            className="game__twitch-item"
            onClick={openViewer('twitch', index)}
            video={video}
            kind="block"
            size="medium"
            source="twitch"
            key={video.id}
          />
        ))}
        <ViewAll size="l" message="View all streams" count={count} path={paths.gameTwitch(slug)} />
      </div>
    </div>
  );
};

GameTwitchBlock.propTypes = componentPropertyTypes;
GameTwitchBlock.defaultProps = componentDefaultProperties;

export default pure(GameTwitchBlock);
