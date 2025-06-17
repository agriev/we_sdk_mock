import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';
import max from 'lodash/max';
import { Link } from 'app/components/link';

import { FormattedMessage } from 'react-intl';
import paths from 'config/paths';

import icons from 'assets/icons/platforms-bg';
import iconsRow from 'assets/icons/platforms-icons';

import './platforms-stats.styl';
import { DISCOVER_SEC_LIBRARY } from 'app/pages/discover/discover.sections';

const EMPTY_PLATFORMS = [
  { percent: 50, platform: { slug: 'pc' } },
  { percent: 25, platform: { slug: 'playstation' } },
  { percent: 15, platform: { slug: 'mac' } },
  { percent: 10, platform: { slug: 'ios' } },
];

const renderIcon = (slug, size, type) => {
  const svg = type === 'rows' ? iconsRow[slug] : icons[slug];

  if (svg) {
    return (
      <SVGInline
        svg={svg}
        className={cn({
          'platforms-stats__platform-icon': true,
          [`platforms-stats__platform-icon_${slug}`]: true,
          'platforms-stats__platform-icon_row': type === 'rows',
        })}
      />
    );
  }

  return null;
};

const profilePath = (profileUserSlug, platformID, sameIds) => {
  const filter = JSON.stringify({
    ordering: ['-released'],
    parent_platforms: [platformID],
  });

  const url = sameIds ? paths.discoverSection(DISCOVER_SEC_LIBRARY) : paths.profileGames(profileUserSlug);
  const filtersKey = sameIds ? 'filters' : 'filter';

  return `${url}?${filtersKey}=${encodeURIComponent(filter)}`;
};

const renderPlatformMeta = (platform, type, profileUserSlug, sameIds) => {
  const {
    count,
    platform: { name, slug, id },
  } = platform;

  const className = cn('platforms-stats__platform-meta-label', `platforms-stats__platform-meta-label_${slug}`);

  return profileUserSlug ? (
    <Link
      to={profilePath(profileUserSlug, id, sameIds)}
      className="platforms-stats__platform-meta platforms-stats__no-link"
      key={slug}
      rel="nofollow"
    >
      {type !== 'rows' && <span className={className} />}
      <span className="platforms-stats__platform-meta-name">
        {name}
        <span className="platforms-stats__platform-meta-count">{count}</span>
      </span>
    </Link>
  ) : (
    <div className="platforms-stats__platform-meta" key={slug}>
      {type !== 'rows' && <span className={className} />}
      <span className="platforms-stats__platform-meta-name">
        {name}
        <span className="platforms-stats__platform-meta-count">{count}</span>
      </span>
    </div>
  );
};

const renderPlatform = (platform, size, type, maxPercent, profileUserSlug, sameIds) => {
  const {
    percent,
    platform: { slug, id },
  } = platform;

  let renderPercent = percent;
  let marginLeft = 0;
  let outsideLabel = false;

  if (type === 'rows') {
    const renderPercentDividend = percent / maxPercent;
    renderPercent = renderPercentDividend * 100;
    if (renderPercent < 17) renderPercent = 17;
    if (renderPercent < 46) {
      marginLeft = `calc(${26 + renderPercent}% - 8px)`;
      outsideLabel = true;
    }
  }

  const className = cn(
    'platforms-stats__platform',
    `platforms-stats__platform_${slug}`,
    type === 'small' ? 'platforms-stats__platform-small' : '',
    !outsideLabel ? `platforms-stats__platform_inside_${slug}` : '',
    profileUserSlug ? 'platforms-stats__platform-link' : '',
  );

  const style = {
    width: `${Math.round(renderPercent)}%`,
  };

  const content = (
    <>
      {renderPercent >= 10 && renderIcon(slug, size, type)}
      {type === 'rows' && <div style={{ marginLeft }}>{renderPlatformMeta(platform, type, undefined, sameIds)}</div>}
    </>
  );

  return profileUserSlug ? (
    <Link to={profilePath(profileUserSlug, id, sameIds)} className={className} style={style} key={slug} rel="nofollow">
      {content}
    </Link>
  ) : (
    <div className={className} style={style} key={slug}>
      {content}
    </div>
  );
};

const componentPropertyTypes = {
  className: PropTypes.string,
  size: PropTypes.string,
  platforms: PropTypes.shape({
    count: PropTypes.number,
    results: PropTypes.array,
  }),
  type: PropTypes.oneOf(['big', 'small', 'rows']),
  profileUserSlug: PropTypes.string,
  currentUserSlug: PropTypes.string.isRequired,
};

const defaultProps = {
  className: '',
  size: 'desktop',
  platforms: {},
  type: 'big',
  profileUserSlug: '',
};

const PlatformsStats = ({ className, platforms, size, type, profileUserSlug, currentUserSlug }) => {
  const { count, results } = platforms;
  const maxPercent = max(results.map((rslt) => rslt.percent));
  const sameIds = currentUserSlug === profileUserSlug;

  return (
    <div className={cn('platforms-stats', className, { 'platforms-stats__row': type === 'rows' })}>
      {count > 0 ? (
        <div>
          <div className={cn('platforms-stats__platforms', { 'platforms-stats__platforms-small': type === 'small' })}>
            {results.map((platform) => renderPlatform(platform, size, type, maxPercent, profileUserSlug, sameIds))}
          </div>
          <div className="platforms-stats__platforms-meta">
            {type !== 'rows' && results.map((platform) => renderPlatformMeta(platform, type, profileUserSlug, sameIds))}
          </div>
        </div>
      ) : (
        <div>
          <div className="platforms-stats__platforms">
            {EMPTY_PLATFORMS.map((platform) => renderPlatform(platform, size, type, maxPercent, undefined, sameIds))}
          </div>
          <div className="platforms-stats__empty-text">
            <FormattedMessage id="profile.overview_platforms_stats_empty" />
          </div>
        </div>
      )}
    </div>
  );
};

PlatformsStats.propTypes = componentPropertyTypes;
PlatformsStats.defaultProps = defaultProps;

export default PlatformsStats;
