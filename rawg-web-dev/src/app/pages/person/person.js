import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';

import complement from 'ramda/src/complement';

import compareBy from 'tools/ramda/compare-by';

import paths from 'config/paths';

import prepare from 'tools/hocs/prepare';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';

import appHelper from 'app/pages/app/app.helper';
import styleVars from 'styles/vars.json';
import DiscoverPage from 'app/ui/discover-page';
import DiscoverGamesList from 'app/components/discover-games-list';
import ButtonFollow from 'app/ui/button-follow';
import DiscoverSharing from 'app/ui/discover-sharing';

import gameType from 'app/pages/game/game.types';
import locationShape from 'tools/prop-types/location-shape';

import { loadDiscoverFollowings, toggleFollow } from 'app/pages/discover/discover.actions';

import { prepareDiscoverFilter } from 'app/components/discover-filter/discover-filter.funcs';
import { getFiltersFromLocation } from 'app/ui/filter/filter.funcs';

import { loadCatalog } from 'app/pages/games/games.actions';

import PersonHeader from './person-header';
import PersonDescription from './person-description';

import './person.styl';

import { loadPerson, loadPersonGames } from './person.actions';

@hot
@connect((state) => ({
  size: state.app.size,
  allRatings: state.app.ratings,
  person: state.person,
  personsGames: denormalizeGamesArr(state, 'person.games.items'),
  currentUser: state.currentUser,
  appSize: state.app.size,
  platforms: state.games.platforms,
}))
@prepare(
  async ({ store, params = {}, location }) => {
    const { id } = params;
    const { query } = location;
    const { page = 1 } = query;

    const filters = prepareDiscoverFilter(getFiltersFromLocation({ location }));
    const loadedNormally = await store.dispatch(loadPerson(id));

    if (loadedNormally) {
      await Promise.all([
        store.dispatch(loadPersonGames({ id, page, filters })),
        // store.dispatch(loadPersonGamesKnownFor(id)),
        store.dispatch(loadDiscoverFollowings()),
        store.dispatch(loadCatalog()),
      ]);
    }
  },
  {
    updateOn: complement(
      compareBy(({ location, params }) => ({
        filters: getFiltersFromLocation({ location }),
        section: params.splat,
      })),
    ),
  },
)
@injectIntl
export default class Person extends Component {
  static propTypes = {
    person: PropTypes.shape().isRequired,
    dispatch: PropTypes.func.isRequired,
    personsGames: PropTypes.arrayOf(gameType).isRequired,
    appSize: PropTypes.string.isRequired,
    location: locationShape.isRequired,
    params: PropTypes.shape().isRequired,
    platforms: PropTypes.arrayOf(PropTypes.object).isRequired,
  };

  getPageProps() {
    const {
      seo_title: title,
      seo_description: description,
      image_background: imageBackground,
      dominant_color: dominantColor,
    } = this.props.person;
    const imageColor = dominantColor || styleVars.mainBGColor.replace(/#/g, '');

    return {
      helmet: {
        title,
        description,
        image: imageBackground,
      },
      art: {
        image: {
          path: imageBackground,
          color: `#${imageColor}`,
        },
        height: '500px',
        colored: true,
        ugly: false,
      },
      attrs: {
        itemScope: true,
        itemType: 'http://schema.org/Person',
      },
    };
  }

  loadPersonGames = () => {
    const { person, dispatch, location } = this.props;

    const { id, games } = person;
    const { next } = games;
    const filters = prepareDiscoverFilter(getFiltersFromLocation({ location }));

    return dispatch(loadPersonGames({ id, page: next, filters }));
  };

  onFollowToggle = () => {
    const { dispatch, person } = this.props;

    toggleFollow(dispatch, person, 'person');
  };

  renderHeading = () => {
    const { person } = this.props;
    const { name, positions, image } = person;

    return <PersonHeader name={name} positions={positions} image={image} />;
  };

  renderDescription = () => {
    const { person } = this.props;
    const { description } = person;

    return description && <PersonDescription description={description} />;
  };

  render() {
    const { person, personsGames, location, params, appSize, platforms } = this.props;

    const { pathname } = location;
    const { games } = person;
    const { next, loading, loaded, count } = games;

    const isPhone = appHelper.isPhoneSize(appSize);
    const filters = prepareDiscoverFilter(getFiltersFromLocation({ location }));

    const headerRightContent = (
      <>
        <ButtonFollow
          className="person__follow-btn"
          following={person.following}
          followLoading={person.followLoading}
          onClick={this.onFollowToggle}
        />
        <DiscoverSharing url={pathname} />
      </>
    );

    return (
      <DiscoverPage
        pageProperties={this.getPageProps()}
        className="person"
        pathname={pathname}
        isPhoneSize={isPhone}
        heading={this.renderHeading()}
        description={this.renderDescription()}
        headerRightContent={headerRightContent}
      >
        <DiscoverGamesList
          load={this.loadPersonGames}
          games={{
            items: personsGames,
            count,
            next,
            loading,
            loaded,
          }}
          withFilter
          clearFitlerPath={paths.creator(params.id)}
          filterProperties={{
            urlBase: paths.creator(params.id),
            linkable: 'withQueries',
            enableOrdering: true,
            enableDatesFilter: false,
            enablePlatformsFilter: true,
            filters,
            platforms,
          }}
        />
      </DiscoverPage>
    );
  }
}
