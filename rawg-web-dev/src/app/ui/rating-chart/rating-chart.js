import React from 'react';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import { Link } from 'app/components/link';
import { Link as ScrollLink } from 'react-scroll';
import find from 'lodash/find';
import get from 'lodash/get';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import intlShape from 'tools/prop-types/intl-shape';

import Rating from 'app/ui/rating';
import paths from 'config/paths';

import './rating-chart.styl';

const componentPropertyTypes = {
  intl: intlShape.isRequired,
  className: PropTypes.string,
  ratingTop: PropTypes.number,
  reviewsCount: PropTypes.number,
  gamesCount: PropTypes.number,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  charts: PropTypes.shape({}),
  genres: PropTypes.arrayOf(PropTypes.object),
};

const defaultProps = {
  className: '',
  ratingTop: 0,
  reviewsCount: 0,
  gamesCount: 0,
  charts: {},
  genres: [],
};

const getFilterLink = (slug) => `${paths.games}/${slug}`;

const GenreBlock = ({ genres, genre }) => {
  const genreSlug = get(find(genres, { name: genre.name }), 'slug');
  const genresUrl = getFilterLink(genreSlug);
  return (
    <div className="rating-chart__chart">
      <div className="rating-chart__number">
        <span className="rating-chart__number-icon">#</span>
        {genre.position}
      </div>
      <div className="rating-chart__bottom">
        <Link className="rating-chart__bottom-link" to={genresUrl} href={genresUrl}>
          {genre.name}
        </Link>
      </div>
    </div>
  );
};

GenreBlock.propTypes = {
  genres: PropTypes.arrayOf(PropTypes.object).isRequired,
  genre: PropTypes.shape({
    name: PropTypes.string.isRequired,
    position: PropTypes.number.isRequired,
  }).isRequired,
};

const YearBlock = ({ year }) => {
  const yearsUrl = getFilterLink(year.year);
  return (
    <div className="rating-chart__chart">
      <div className="rating-chart__number">
        <span className="rating-chart__number-icon">#</span>
        {year.position}
      </div>
      <div className="rating-chart__bottom">
        <Link className="rating-chart__bottom-link" to={yearsUrl} href={yearsUrl}>
          <SimpleIntlMessage id="game.chart_year" values={{ year: year.year }} />
        </Link>
      </div>
    </div>
  );
};

YearBlock.propTypes = {
  year: PropTypes.shape({
    year: PropTypes.number.isRequired,
    position: PropTypes.number.isRequired,
  }).isRequired,
};

const RatingChart = ({ className, ratingTop, reviewsCount, gamesCount, allRatings, charts, intl, genres }) => {
  const { genre, year } = charts || {};
  const { messages } = intl;
  const rating = allRatings.find((r) => r.id === ratingTop);

  return (
    <div className={['rating-chart', className].join(' ')}>
      {gamesCount !== 0 && (
        <div className="rating-chart__chart rating-chart__chart-games">
          <div>
            <div className="rating-chart__number">{gamesCount}</div>
            <div className="rating-chart__bottom">{messages['game.games_count']}</div>
          </div>
        </div>
      )}

      <div className="rating-chart__chart rating-chart__chart_rating">
        <>
          {rating ? (
            <Rating className="rating-chart__rating" rating={rating} allRatings={allRatings} kind="text" />
          ) : (
            <div className="rating-chart__rating-empty">
              <SimpleIntlMessage id="game.reviews_empty" />
              <div className="rating-chart__rating-empty-icon" />
            </div>
          )}
          <div className="rating-chart__bottom">
            <ScrollLink className="rating-chart__bottom-link" to="reviews" spy smooth offset={-120} duration={0}>
              {rating ? (
                <SimpleIntlMessage id="game.reviews_count" values={{ count: reviewsCount }} />
              ) : (
                <SimpleIntlMessage id="game.reviews_not_enough" values={{ count: reviewsCount }} />
              )}
            </ScrollLink>
          </div>
        </>
      </div>
      {genre && <GenreBlock genres={genres} genre={genre} />}
      {year && <YearBlock year={year} />}
    </div>
  );
};

RatingChart.propTypes = componentPropertyTypes;
RatingChart.defaultProps = defaultProps;

export default injectIntl(RatingChart);
