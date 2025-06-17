/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { compose, pure } from 'recompose';
import { Element } from 'react-scroll';
import { injectIntl } from 'react-intl';

import formatNumber from 'tools/format-number';

import YoutubeVideoList from 'app/ui/youtube-video-list';
import ViewAll from 'app/ui/vew-all';
import youtubeLogo from 'assets/icons/youtube-logo.svg';
import paths from 'config/paths';
import SectionHeading from 'app/ui/section-heading';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import { youtube as youtubeType, youtube_count as youtubeCountType, slug as slugType } from 'app/pages/game/game.types';
import intlShape from 'tools/prop-types/intl-shape';

const hoc = compose(
  pure,
  injectIntl,
);

const componentPropertyTypes = {
  youtube: youtubeType,
  youtube_count: youtubeCountType,
  slug: slugType,
  name: PropTypes.string.isRequired,
  intl: intlShape.isRequired,
};

const componentDefaultProperties = {
  youtube: {
    results: [],
  },
  youtube_count: 0,
  slug: '',
};

const GameYoutubeBlock = ({ slug, youtube, youtube_count, name, intl }) => {
  const { results } = youtube;

  if (!Array.isArray(results) || results.length === 0) return null;

  const url = paths.gameYoutube(slug);

  return (
    <div className="game__youtube">
      <Element name="youtube" />
      <SectionHeading
        url={url}
        heading={<SimpleIntlMessage id="game.youtube_title" values={{ name }} />}
        image={{
          src: paths.svgImagePath(youtubeLogo),
          alt: 'youtube',
        }}
        count={
          <SimpleIntlMessage
            id="game.youtube_count"
            values={{ count: youtube_count, countStr: formatNumber(youtube_count) }}
          />
        }
      />
      <YoutubeVideoList videos={results} truncateChannelTitleOnDesktop>
        {results.length > 7 && (
          <ViewAll
            className="game__youtube-view-all"
            size="s"
            message={intl.formatMessage({ id: 'game.view_all_videos' })}
            count={youtube_count}
            path={paths.gameYoutube(slug)}
          />
        )}
      </YoutubeVideoList>
    </div>
  );
};

GameYoutubeBlock.propTypes = componentPropertyTypes;
GameYoutubeBlock.defaultProps = componentDefaultProperties;

export default hoc(GameYoutubeBlock);
