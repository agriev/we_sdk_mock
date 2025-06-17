/* eslint-disable camelcase */

import React, { Fragment } from 'react';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';

import paths from 'config/paths';
import len from 'tools/array/len';

import Time from 'app/ui/time';
import MetascoreLabel from 'app/ui/metascore-label';
import HiddenLink from 'app/ui/hidden-link';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import {
  platforms as gamePlatformsType,
  metacritic as gameMetacriticType,
  developers as gameDevelopersType,
  genres as gameGenresType,
  tags as gameTagsType,
  additions as gameAdditionsType,
  gameSeries as gameSeriesType,
  parents as gameParentsType,
  publishers as gamePublishersType,
  released as gameReleasedType,
  esrb_rating as gameESRBRatingType,
  website as gameWebsiteType,
  tba as gameTbaType,
  esrbTitles,
} from 'app/pages/game/game.types';

const gameMetaBlockPropertyTypes = {
  platforms: gamePlatformsType,
  metacritic: gameMetacriticType,
  developers: gameDevelopersType,
  genres: gameGenresType,
  tags: gameTagsType,
  additions: gameAdditionsType,
  gameSeries: gameSeriesType,
  parents: gameParentsType,
  publishers: gamePublishersType,
  released: gameReleasedType,
  esrb_rating: gameESRBRatingType,
  website: gameWebsiteType,
  tba: gameTbaType,
};

const gameMetaBlockDefaultProperties = {
  platforms: [],
  metacritic: 0,
  developers: [],
  genres: [],
  tags: [],
  publishers: [],
  released: '',
  esrb_rating: null,
  website: '',
  tba: false,
};

class GameMetaBlock extends React.Component {
  static propTypes = gameMetaBlockPropertyTypes;

  static defaultProps = gameMetaBlockDefaultProperties;

  renderPlatforms() {
    const { platforms } = this.props;

    if (len(platforms) === 0) {
      return null;
    }

    return (
      <div className="game__meta-block">
        <div className="game__meta-title">
          <SimpleIntlMessage id="game.platforms" />
        </div>
        <div className="game__meta-text">
          {platforms.map((platform, index) => (
            <Fragment key={platform.platform.id}>
              <meta itemProp="gamePlatform" content={platform.platform.name} />
              <Link className="game__meta-filter-link" to={paths.platform(platform.platform.slug)}>
                {platform.platform.name}
              </Link>
              {index !== platforms.length - 1 && ', '}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  renderMetacritic() {
    const { metacritic } = this.props;

    if (!metacritic) {
      return null;
    }

    return (
      <div className="game__meta-block">
        <div className="game__meta-title">
          <SimpleIntlMessage id="game.metacritic" />
        </div>
        <div className="game__meta-text game__meta-text_large">
          <MetascoreLabel rating={metacritic} />
        </div>
      </div>
    );
  }

  renderGenres() {
    const { genres } = this.props;

    if (len(genres) === 0) {
      return null;
    }

    return (
      <div className="game__meta-block">
        <div className="game__meta-title">
          <SimpleIntlMessage id="game.genre" />
        </div>
        <div className="game__meta-text">
          {genres.map((genre, index) => (
            <Fragment key={genre.id}>
              <meta itemProp="genre" content={genre.name} />
              <Link className="game__meta-filter-link" to={paths.genre(genre.slug)}>
                {genre.name}
              </Link>
              {index !== genres.length - 1 && ', '}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  renderReleaseDate() {
    const { released, tba } = this.props;

    if (!released && !tba) {
      return null;
    }

    const getDate = () => {
      const [year, month, day] = released.split('-');
      return new Date(Date.UTC(year, month - 1, day));
    };

    const date = tba ? undefined : getDate();

    return (
      <div className="game__meta-block">
        <div className="game__meta-title">
          <SimpleIntlMessage id="game.release_date" />
        </div>
        {tba && (
          <div className="game__meta-text">
            <SimpleIntlMessage id="game.release_date_tba" />
          </div>
        )}
        {!tba && (
          <div itemProp="datePublished" dateTime={date} className="game__meta-text">
            <Time
              date={date}
              format={{
                timeZone: 'UTC',
              }}
            />
          </div>
        )}
      </div>
    );
  }

  renderDevelopers() {
    const { developers } = this.props;

    if (len(developers) === 0) {
      return null;
    }

    return (
      <div className="game__meta-block">
        <div className="game__meta-title">
          <SimpleIntlMessage id="game.developer" />
        </div>
        <div className="game__meta-text">
          {developers.map((developer, index) => (
            <Fragment key={developer.id}>
              <HiddenLink className="game__meta-filter-link" to={paths.developer(developer.slug)}>
                <div itemProp="creator" itemScope itemType="http://schema.org/Organization">
                  <meta itemProp="name" content={developer.name} />
                </div>
                {developer.name}
              </HiddenLink>
              {index !== developers.length - 1 && ', '}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  renderPublishers() {
    const { publishers } = this.props;

    if (len(publishers) === 0) {
      return null;
    }

    return (
      <div className="game__meta-block">
        <div className="game__meta-title">
          <SimpleIntlMessage id="game.publisher" />
        </div>
        <div className="game__meta-text">
          {publishers.map((publisher, index) => (
            <Fragment key={publisher.id}>
              <meta itemProp="publisher" content={publisher.name} />
              <HiddenLink className="game__meta-filter-link" to={paths.publisher(publisher.slug)}>
                {publisher.name}
              </HiddenLink>
              {index !== publishers.length - 1 && ', '}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  renderESRBRating() {
    const { esrb_rating } = this.props;

    return (
      <div className="game__meta-block">
        <div className="game__meta-title">
          <SimpleIntlMessage id="game.age" />
        </div>
        <div className="game__meta-text">{esrb_rating ? esrbTitles[esrb_rating.id] : 'Без рейтинга'}</div>
      </div>
    );
  }

  renderParents() {
    const { parents } = this.props;
    const { results, count } = parents || {};

    if (len(results) === 0) {
      return null;
    }

    return (
      <div className="game__meta-block game__meta-block_wide">
        <div className="game__meta-title">
          <FormattedMessage id="game.parents" values={{ count }} />
        </div>
        <div className="game__meta-text game__meta-text_secondary">
          {results.map((game, index) => (
            <Fragment key={game.id}>
              <Link
                className="game__meta-filter-link game__meta-filter-link_parents"
                to={{ pathname: paths.game(game.slug), state: game }}
              >
                {game.name}
              </Link>
              {index !== results.length - 1 && ', '}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  renderGameSeries() {
    const { gameSeries } = this.props;
    const { results } = gameSeries || {};

    if (len(results) === 0) {
      return null;
    }

    return (
      <div className="game__meta-block game__meta-block_wide">
        <div className="game__meta-title">
          <SimpleIntlMessage id="game.game_series" />
        </div>
        <div className="game__meta-text game__meta-text_secondary">
          {results.map((game, index) => (
            <Fragment key={game.id}>
              <Link
                className="game__meta-filter-link game__meta-filter-link_game-series"
                to={{ pathname: paths.game(game.slug), state: game }}
              >
                {game.name}
              </Link>
              {index !== results.length - 1 && ', '}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  renderDLCs() {
    const { additions } = this.props;
    const { results } = additions || {};

    if (len(results) === 0) {
      return null;
    }

    return (
      <div className="game__meta-block game__meta-block_wide">
        <div className="game__meta-title">
          <SimpleIntlMessage id="game.additions" />
        </div>
        <div className="game__meta-text game__meta-text_secondary">
          {results.map((game, index) => (
            <Fragment key={game.id}>
              <Link
                className="game__meta-filter-link game__meta-filter-link_dlc"
                to={{ pathname: paths.game(game.slug), state: game }}
              >
                {game.name}
              </Link>
              {index !== results.length - 1 && ', '}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  renderTags() {
    const { tags } = this.props;

    if (len(tags) === 0) {
      return null;
    }

    return (
      <div className="game__meta-block game__meta-block_wide">
        <div className="game__meta-title">
          <SimpleIntlMessage id="game.tags" />
        </div>
        <div itemProp="keywords" className="game__meta-text game__meta-text_secondary">
          {tags.map((tag, index) => (
            <Fragment key={tag.id}>
              <Link className="game__meta-filter-link" to={paths.tag(tag.slug)}>
                {tag.name}
              </Link>
              {index !== tags.length - 1 && ', '}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  renderWebsite() {
    const { website } = this.props;

    if (!website) {
      return null;
    }

    return (
      <div className="game__meta-block game__meta-block_wide">
        <div className="game__meta-title">
          <SimpleIntlMessage id="game.website" />
        </div>
        <div
          role="button"
          tabIndex="0"
          onClick={() => {
            window.open(website, '_blank');
          }}
          className="game__meta-text"
        >
          <div rel="noopener noreferrer" className="game__meta-website">
            {website}
          </div>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="game__meta">
        {this.renderPlatforms()}
        {this.renderMetacritic()}
        {this.renderGenres()}
        {this.renderReleaseDate()}
        {this.renderDevelopers()}
        {this.renderPublishers()}
        {this.renderESRBRating()}
        {this.renderParents()}
        {this.renderGameSeries()}
        {this.renderDLCs()}
        {this.renderTags()}
        {this.renderWebsite()}
      </div>
    );
  }
}

export default GameMetaBlock;
