/* eslint-disable camelcase */

import React from 'react';
import { pure } from 'recompose';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';

import formatNumber from 'tools/format-number';

import ViewAll from 'app/ui/vew-all';
import paths from 'config/paths';
import AmpYoutubeCard from 'app/pages/amp/shared/amp-youtube-card';

import { youtube as youtubeType, youtube_count as youtubeCountType, slug as slugType } from 'app/pages/game/game.types';

const componentPropertyTypes = {
  youtube: youtubeType,
  youtube_count: youtubeCountType,
  slug: slugType,
};

const componentDefaultProperties = {
  youtube: {
    results: [],
  },
  youtube_count: 0,
  slug: '',
};

const AmpYoutube = (props) => {
  const { slug, youtube, youtube_count } = props;
  const { results } = youtube;

  if (!Array.isArray(results) || results.length === 0) return null;

  const url = paths.gameYoutube(slug);

  return (
    <div className="game__youtube">
      <div className="game__block-title-and-count">
        <Link to={url} href={url} className="game__block-title game__block-title_additional">
          <FormattedMessage id="game.youtube" />
          {/* <SVGInline className="game__block-title-icon" svg={youtubeLogo} /> */}
          <div className="amp-youtube__icon game__block-title-icon" />
        </Link>
        <Link to={url} href={url} className="game__block-count">
          <FormattedMessage
            id="game.youtube_count"
            values={{ count: youtube_count, countStr: formatNumber(youtube_count) }}
          />
        </Link>
      </div>
      <AmpYoutubeCard slug={slug} video={results[0]} index={0} />
      <div className="game__youtube-list">
        {results.slice(1, 5).map((video, index) => (
          <AmpYoutubeCard key={video.id} slug={slug} video={video} kind="inline" index={index} />
        ))}
      </div>
      {results.length > 7 && (
        <ViewAll
          className="game__youtube-view-all"
          size="s"
          message="view all videos"
          count={youtube_count}
          path={paths.gameYoutube(slug)}
        />
      )}
    </div>
  );
};

AmpYoutube.propTypes = componentPropertyTypes;
AmpYoutube.defaultProps = componentDefaultProperties;

export default pure(AmpYoutube);
