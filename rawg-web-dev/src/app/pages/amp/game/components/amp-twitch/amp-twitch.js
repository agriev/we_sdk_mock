import React from 'react';
import { pure } from 'recompose';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';

import ViewAll from 'app/ui/vew-all';
import paths from 'config/paths';
import { slug as slugType, twitch as twitchType } from 'app/pages/game/game.types';

const componentPropertyTypes = {
  slug: slugType,
  twitch: twitchType,
};

const componentDefaultProperties = {
  slug: '',
  twitch: {
    results: [],
    count: 0,
  },
};

const thumbnailUrl = (url) => url.replace('%{width}', '440').replace('%{height}', '250');

const AmpTwitch = ({ slug, twitch }) => {
  const { results, count } = twitch;

  if (results.length === 0) return null;

  return (
    <div className="game__twitch">
      <Link
        className="game__block-title game__block-title_additional game__block-title_center"
        to={paths.gameTwitch(slug)}
        href={paths.gameTwitch(slug)}
      >
        <FormattedMessage id="game.twitch" />
        <span className="game__block-title-count">{count}</span>
        <div className="amp-twitch__title-icon game__block-title-icon" />
      </Link>

      <div className="game__twitch-content">
        <amp-carousel height="125">
          {results.slice(0, 3).map((video, index) => (
            <Link to={paths.gameTwitchView(slug, index)} href={paths.gameTwitchView(slug, index)} key={video.id}>
              <amp-img src={thumbnailUrl(video.thumbnail)} width="222" height="125" />
            </Link>
          ))}
          <div className="amp-twich__view-all-wrap">
            <amp-img width="222" height="125" src={{}}>
              <ViewAll size="l" message="View all streams" count={count} path={paths.gameTwitch(slug)} />
            </amp-img>
          </div>
        </amp-carousel>
      </div>
    </div>
  );
};

AmpTwitch.propTypes = componentPropertyTypes;
AmpTwitch.defaultProps = componentDefaultProperties;

export default pure(AmpTwitch);
