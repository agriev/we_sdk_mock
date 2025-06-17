/* eslint-disable camelcase */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';

import prepare from 'tools/hocs/prepare';
import denormalizeGame from 'tools/redux/denormalize-game';

import len from 'tools/array/len';

import RatingChart from 'app/ui/rating-chart';
import { appSizeType, appRatingsType, genres as appGenresType } from 'app/pages/app/app.types';
import { currentUserIdType } from 'app/components/current-user/current-user.types';
import paths from 'config/paths';
import AmpPageHeader from 'app/pages/amp/shared/amp-page-header';
// import GameButtons from 'app/components/game-buttons';
import GameHeadBlock from 'app/pages/game/game/head';
import GameRatingsBlock from 'app/pages/game/game/ratings';
import GameOwnersBlock from 'app/pages/game/game/owners';
import GameMetaBlock from 'app/pages/game/game/meta';
import GameSystemRequirementsBlock from 'app/pages/game/game/system-requirements';
import GameAvailabilityBlock from 'app/pages/game/game/availability';
import PageAmp from 'app/pages/amp/shared/page-amp';

import {
  loadGame,
  loadGameScreenshots,
  loadGameMovies,
  loadGameCollections,
  loadGameSuggestions,
  loadGameReviews,
  loadGamePosts,
  loadGameOwners,
  loadGameYoutube,
  loadGameCreators,
  loadGameImgur,
  loadGameAchievements,
  loadGameReddit,
  loadGameTwitch,
  resetGameState,
} from 'app/pages/game/game.actions';

import gameType from 'app/pages/game/game.types';
import locationShape from 'tools/prop-types/location-shape';

import AmpReddit from './components/amp-reddit';
import AmpPersons from './components/amp-persons';
import AmpAbout from './components/amp-about';
import GameSuggestionsBlock from './components/amp-suggestions';
import AmpGameCollectionsBlock from './components/amp-collections';
import AmpYoutube from './components/amp-youtube';
import AmpGameImgurBlock from './components/amp-imgur';
import GameAchievementsBlock from './components/amp-achievements';
import AmpTwitch from './components/amp-twitch';

@prepare(
  async ({ store, params = {} }) => {
    const { id } = params;

    store.dispatch(resetGameState());

    // Игру загружаем отдельно по той причине,
    // что там может вернуться ответ-редирект,
    // который надо будет обработать.
    // Подробнее: https://3.basecamp.com/3964781/buckets/8674725/todos/1234690684
    const loadedNormally = await store.dispatch(loadGame(id, paths.ampGame));

    if (loadedNormally) {
      await Promise.all([
        // store.dispatch(loadCatalog()),
        store.dispatch(loadGameScreenshots({ id })),
        store.dispatch(loadGameMovies(id)),
        store.dispatch(loadGameCollections(id)),
        store.dispatch(loadGameSuggestions(id, 1)),
        store.dispatch(loadGameReviews(id, 1)),
        store.dispatch(loadGamePosts(id, 1)),
        store.dispatch(loadGameOwners(id)),
        store.dispatch(loadGameYoutube(id, 1)),
        store.dispatch(loadGameCreators(id)),
        store.dispatch(loadGameImgur(id, 1)),
        store.dispatch(loadGameAchievements(id, 1)),
        store.dispatch(loadGameReddit(id, 1)),
        store.dispatch(loadGameTwitch(id, 1)),
      ]);
    }
  },
  {
    updateParam: 'id',
  },
)
@connect((state) => ({
  ratings: state.app.ratings,
  genres: state.app.genres,
  size: state.app.size,
  currentUserId: state.currentUser.id,
  game: denormalizeGame(state),
}))
class Game extends Component {
  static propTypes = {
    size: appSizeType.isRequired,
    ratings: appRatingsType.isRequired,
    genres: appGenresType.isRequired,
    currentUserId: currentUserIdType.isRequired,
    game: gameType.isRequired,
    location: locationShape.isRequired,
  };

  static defaultProps = {};

  constructor(props) {
    super(props);

    this.state = {};
  }

  renderHead = () => {
    const {
      game,
      location: { state: gameLocal = {} },
    } = this.props;

    const { name, released, platforms, parent_platforms, playtime, promo } =
      game.name.length === 0 && Object.keys(gameLocal).length > 0 ? gameLocal : game;

    return (
      <GameHeadBlock
        size="phone"
        name={name}
        released={released}
        platforms={platforms}
        parent_platforms={parent_platforms}
        playtime={playtime}
        promo={promo}
      />
    );
  };

  renderScreenshots() {
    const {
      game,
      game: { screenshots },
    } = this.props;
    return (
      <amp-carousel width="auto" height="150">
        {screenshots.results.map((screenshot, index) => (
          <Link
            to={paths.gameScreenshotsView(game.slug, index)}
            key={screenshot.id}
            href={paths.gameScreenshotsView(game.slug, index)}
          >
            <amp-img src={screenshot.image} width="264" key={screenshot.id} height="148" />
          </Link>
        ))}
      </amp-carousel>
    );
  }

  renderCharts() {
    const { game, ratings, genres } = this.props;
    const { rating_top, reviews_count = 0, charts } = game;

    return (
      <RatingChart
        ratingTop={rating_top}
        reviewsCount={reviews_count}
        allRatings={ratings}
        charts={charts}
        genres={genres}
      />
    );
  }

  renderRatings = () => {
    const {
      currentUserId,
      ratings: allRatings,
      game: { id, name, slug, reviews_count, ratings, user_review },
    } = this.props;

    return (
      <GameRatingsBlock
        id={id}
        isStat={false}
        name={name}
        slug={slug}
        reviews_count={reviews_count}
        user_review={user_review}
        ratings={ratings}
        allRatings={allRatings}
        currentUserId={currentUserId}
      />
    );
  };

  renderAbout() {
    const {
      game: { description },
    } = this.props;
    return <AmpAbout description={description} />;
  }

  renderAchievements() {
    const { game } = this.props;
    const { slug, achievements } = game;

    return <GameAchievementsBlock slug={slug} achievements={achievements} />;
  }

  renderAvailability() {
    const { stores = [] } = this.props.game;

    if (stores.length === 0) return null;

    return <GameAvailabilityBlock stores={stores} />;
  }

  renderButtons() {
    // const { game } = this.props;

    return null; // <GameButtons className="game__buttons" game={game} />;
  }

  renderCollections() {
    const {
      game: { slug, collections },
    } = this.props;

    return <AmpGameCollectionsBlock slug={slug} collections={collections} />;
  }

  renderImgur() {
    const { game } = this.props;
    const { slug, imgur } = game;

    return <AmpGameImgurBlock slug={slug} imgur={imgur} />;
  }

  renderMeta() {
    const { game } = this.props;
    const { platforms, metacritic, developers, genres, tags, publishers, released, esrb_rating, website } = game;

    return (
      <GameMetaBlock
        platforms={platforms}
        metacritic={metacritic}
        developers={developers}
        genres={genres}
        tags={tags}
        publishers={publishers}
        released={released}
        esrb_rating={esrb_rating}
        website={website}
      />
    );
  }

  renderOwners() {
    const { owners, id, name, slug } = this.props.game;

    return <GameOwnersBlock id={id} name={name} slug={slug} owners={owners} />;
  }

  renderReddit() {
    const { game, size } = this.props;
    const { slug, reddit } = game;
    const { results, count } = reddit || {};

    if (len(results) === 0) return null;

    return <AmpReddit size={size} titleLink={paths.gameReddit(slug)} count={count} results={results} />;
  }

  renderSuggestions() {
    const {
      game: { slug, suggestions },
    } = this.props;

    return <GameSuggestionsBlock slug={slug} suggestions={suggestions} />;
  }

  renderSystemRequirements() {
    const { game } = this.props;
    const { platforms } = game;

    if (game.iframe_url) {
      return null;
    }

    return <GameSystemRequirementsBlock platforms={platforms} />;
  }

  renderTwitch() {
    const { game } = this.props;
    const { slug, twitch } = game;

    return <AmpTwitch slug={slug} twitch={twitch} />;
  }

  renderYoutube() {
    const { game } = this.props;
    const { slug, youtube, youtube_count } = game;

    return <AmpYoutube youtube={youtube} youtube_count={youtube_count} slug={slug} />;
  }

  renderPersons() {
    const {
      game: { slug, persons },
    } = this.props;

    return <AmpPersons persons={persons} path={paths.gameTeam(slug)} />;
  }

  render() {
    const {
      game: { slug },
    } = this.props;
    const helmetProperties = {
      canonical: paths.game(slug),
    };

    return (
      <PageAmp helmet={helmetProperties}>
        <AmpPageHeader />
        {this.renderHead()}
        {this.renderScreenshots()}
        {this.renderCharts()}
        {this.renderRatings()}
        {/* {this.renderButtons()} need rewrite */}
        {/* {this.renderOwners()} Avatars issue */}
        {this.renderAbout()}
        {this.renderMeta()}
        {/* {this.renderSystemRequirements()} need to check */}
        {this.renderAvailability()}
        {this.renderSuggestions()}
        {this.renderCollections()}
        {this.renderYoutube()}
        {this.renderPersons()}
        {this.renderImgur()}
        {this.renderAchievements()}
        {this.renderReddit()}
        {this.renderTwitch()}
      </PageAmp>
    );
  }
}

export default Game;
