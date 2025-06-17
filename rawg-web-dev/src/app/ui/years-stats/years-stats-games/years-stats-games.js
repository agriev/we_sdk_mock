import React from 'react';
import PropTypes from 'prop-types';
import range from 'lodash/range';
import max from 'lodash/max';

import formatNumber from 'tools/format-number';
import appHelper from 'app/pages/app/app.helper';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import GameCardCompact from 'app/components/game-card-compact';
import Slider from 'app/ui/slider';
import GamePlaceholder from 'app/ui/game-placeholder';
import SectionHeading from 'app/ui/section-heading';

import currentUserType from 'app/components/current-user/current-user.types';

import './years-stats-games.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  size: PropTypes.string,
  stats: PropTypes.shape({}),
  direction: PropTypes.oneOf(['row', 'column']),
  gameOwner: PropTypes.shape(),
  dispatch: PropTypes.func.isRequired,
  currentUser: currentUserType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const defaultProps = {
  className: '',
  size: '',
  stats: { years: [] },
  direction: 'row',
  gameOwner: undefined,
};

const Year = ({
  /* eslint-disable react/prop-types */
  year,
  years,
  showPlaceholders = true,
  dispatch,
  currentUser,
  allRatings,
}) => {
  const maxCount = Math.min(3, max(years.map((yearM) => yearM.count)));

  return (
    <div className="years-stats-games__column" key={year.year}>
      <SectionHeading
        heading={year.year || <SimpleIntlMessage id="profile.release_date_unknown" />}
        count={
          <SimpleIntlMessage
            id="profile.overview_meta_stats_count_games"
            values={{ count: year.count, countStr: formatNumber(year.count) }}
          />
        }
        size="medium"
        type="baseline"
      />
      {Array.isArray(year.games) &&
        year.games
          .slice(0, 3)
          .map((game) => (
            <GameCardCompact
              key={game.id}
              game={game}
              dispatch={dispatch}
              currentUser={currentUser}
              allRatings={allRatings}
            />
          ))}
      {showPlaceholders &&
        range(Math.max(0, maxCount - year.count)).map((index) => <GamePlaceholder key={`p${index}`} />)}
    </div>
  );
};

const YearsStatsGames = ({
  className,
  size,
  stats: { years },
  direction,
  gameOwner,
  dispatch,
  currentUser,
  allRatings,
}) => {
  return appHelper.isDesktopSize({ size }) || direction === 'column' ? (
    <div
      className={[
        'years-stats-games',
        direction === 'column' ? 'years-stats-games__direction-column' : '',
        className,
      ].join(' ')}
    >
      {years.map((year) => (
        <Year
          key={year.year}
          year={year}
          years={years}
          showPlaceholders={direction === 'row'}
          gameOwner={gameOwner}
          dispatch={dispatch}
          currentUser={currentUser}
        />
      ))}
    </div>
  ) : (
    <div className={['years-stats-games', className].join(' ')}>
      <Slider arrows={false} adaptiveHeight={false} dots variableWidth infinite={false} swipeToSlide>
        {years.map((year) => (
          <Year
            key={year.year}
            year={year}
            years={years}
            gameOwner={gameOwner}
            dispatch={dispatch}
            currentUser={currentUser}
            allRatings={allRatings}
          />
        ))}
      </Slider>
    </div>
  );
};

YearsStatsGames.propTypes = componentPropertyTypes;
YearsStatsGames.defaultProps = defaultProps;

export default YearsStatsGames;
