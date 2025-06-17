/* eslint-disable sonarjs/cognitive-complexity, react/no-find-dom-node */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { injectIntl } from 'react-intl';

import get from 'lodash/get';

import prepare from 'tools/hocs/prepare';
import checkFeature from 'tools/hocs/check-feature';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import EntityBreadcrumbs from 'app/pages/suggestions/components/entity-breadcrumbs';

import NoResults from 'app/pages/games/components/no-results';

import SuggestionsDescription from 'app/pages/suggestions/components/description';
import SuggestionsSearch from 'app/pages/suggestions/components/search';
import SuggestionsGamesList from 'app/pages/suggestions/components/games-list';

import RelatedTags from 'app/components/related-tags';

import currentUserType from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import { loadSuggestionsMeta, loadSuggestionsGames } from 'app/pages/suggestions/suggestions.actions';

import './entity.styl';

@checkFeature('suggestions')
@prepare(({ store, params = {}, location }) => {
  const { id } = params;
  const { query } = location;
  const { search, page = 1 } = query;

  return Promise.all([
    store.dispatch(loadSuggestionsMeta({ id })),
    store.dispatch(loadSuggestionsGames({ id, page, data: { search } })),
  ]);
})
@injectIntl
@connect((state, props) => ({
  seoTitle: get(state, `suggestions.entity.meta[${props.params.id}].seo_title`, ''),
  description: get(state, `suggestions.entity.meta[${props.params.id}].description`, ''),
  seoDescription: get(state, `suggestions.entity.meta${props.params.id}].seo_description`, ''),
  seoH1: get(state, `suggestions.entity.meta[${props.params.id}].seo_h1`, ''),
  tags: get(state, `suggestions.entity.meta[${props.params.id}].related_tags`, []),
  games: get(state, `suggestions.entity.games[${props.params.id}]`, {}),
  items: denormalizeGamesArr(state, `suggestions.entity.games[${props.params.id}].items`, []),
  firstPage: state.app.firstPage,
  appSize: state.app.size,
  currentUser: state.currentUser,
  allRatings: state.app.ratings,
}))
@withRouter
export default class SuggestionsEntity extends PureComponent {
  static propTypes = {
    location: locationShape.isRequired,
    dispatch: PropTypes.func.isRequired,
    intl: intlShape.isRequired,
    seoTitle: PropTypes.string,
    seoDescription: PropTypes.string,
    description: PropTypes.string,
    seoH1: PropTypes.string,
    games: PropTypes.shape().isRequired,
    items: PropTypes.arrayOf(PropTypes.shape()).isRequired,
    allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
    tags: PropTypes.arrayOf(PropTypes.shape()),
    params: PropTypes.shape().isRequired,
    currentUser: currentUserType.isRequired,
    appSize: appSizeType.isRequired,
    firstPage: PropTypes.bool.isRequired,
  };

  static defaultProps = {
    seoTitle: null,
    description: null,
    seoDescription: null,
    seoH1: null,
    tags: undefined,
  };

  contentTopRef = React.createRef();

  componentDidMount = () => {
    if (!this.props.firstPage) {
      window.scrollTo(0, 0);
    }
  };

  componentDidUpdate(previousProperties) {
    const { id } = this.props.params;
    const { search } = this.props.location.query;
    const previousSearch = previousProperties.location.query.search;

    if (search !== previousSearch) {
      this.props.dispatch(loadSuggestionsGames({ id, data: { search } }));
    }
  }

  load = () => {
    const { dispatch, games, params } = this.props;
    const { search } = this.props.location.query;

    return dispatch(
      loadSuggestionsGames({
        id: params.id,
        page: games.next,
        data: {
          search,
        },
      }),
    );
  };

  render() {
    const {
      intl,
      seoTitle,
      description,
      seoDescription,
      seoH1,
      dispatch,
      location: { pathname },
      games,
      items,
      tags,
      currentUser,
      appSize,
      allRatings,
    } = this.props;

    const count = get(games, 'count', 0);
    const loading = get(games, 'loading', true);

    return (
      <Page
        helmet={{
          title: seoTitle || intl.formatMessage({ id: 'games.head_title' }),
          description: seoDescription,
          canonical: pathname,
        }}
        className="suggestions-entity-page"
      >
        <Content className="games__suggestions__content" columns="1">
          <EntityBreadcrumbs path={pathname} />
          <div ref={this.contentTopRef} />
          <SuggestionsDescription h1={seoH1} description={description} />
          {tags && <RelatedTags tags={tags} />}
          <SuggestionsSearch count={count} h1={seoH1} />
          <SuggestionsGamesList
            appSize={appSize}
            currentUser={currentUser}
            dispatch={dispatch}
            games={games}
            items={items}
            allRatings={allRatings}
            load={this.load}
          />
          {!loading && count === 0 && <NoResults addClearFilterLink={false} />}
        </Content>
      </Page>
    );
  }
}
