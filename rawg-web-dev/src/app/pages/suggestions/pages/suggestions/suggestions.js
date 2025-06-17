import React, { Component } from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { denormalize } from 'normalizr';

import prepare from 'tools/hocs/prepare';
import checkFeature from 'tools/hocs/check-feature';
import keysEqual from 'tools/keys-equal';
import getPagesCount from 'tools/get-pages-count';

import { loadSuggestionsShowcase } from 'app/pages/suggestions/suggestions.actions';
import Schemas from 'redux-logic/schemas';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Breadcrumbs from 'app/ui/breadcrumbs';
import Heading from 'app/ui/heading';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import SuggestionsSection from 'app/pages/suggestions/components/suggestions-section';
import ListLoader from 'app/ui/list-loader';

import showcaseTypes from 'app/pages/suggestions/suggestions.types';
import { appSizeType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import './suggestions.styl';

const ITEMS_PER_PAGE = 12;

const propTypes = {
  showcase: showcaseTypes.isRequired,
  size: appSizeType.isRequired,
  intl: intlShape.isRequired,
  location: locationShape.isRequired,
  dispatch: PropTypes.func.isRequired,
  suggestions: PropTypes.arrayOf(PropTypes.object).isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentUser: currentUserType.isRequired,
};

@checkFeature('suggestions')
@prepare(async ({ store, location }) => {
  const page = parseInt(location.query.page, 10) || 1;

  await store.dispatch(loadSuggestionsShowcase({ page }));
})
@injectIntl
@connect((state) => ({
  size: state.app.size,
  allRatings: state.app.ratings,
  showcase: state.suggestions.showcase,
  suggestions: denormalize(state.suggestions.showcase.items, Schemas.SUGGESTION_ARRAY, state.entities),
  currentUser: state.currentUser,
}))
export default class Suggestions extends Component {
  static propTypes = propTypes;

  shouldComponentUpdate(nextProperties) {
    return !keysEqual(this.props, nextProperties, [
      'size',
      'showcase.loading',
      'showcase.count',
      'showcase.next',
      'showcase.previous',
      'suggestions',
    ]);
  }

  load = () => {
    const { showcase, dispatch } = this.props;

    return dispatch(loadSuggestionsShowcase({ page: showcase.next }));
  };

  renderSections() {
    const { showcase, size, suggestions, currentUser, dispatch, allRatings } = this.props;

    return (
      <ListLoader
        load={this.load}
        count={showcase.count}
        next={showcase.next}
        loading={showcase.loading}
        pages={getPagesCount(showcase.count, ITEMS_PER_PAGE)}
        isOnScroll
      >
        {suggestions.map((item) => (
          <SuggestionsSection
            section={item}
            key={item.slug}
            size={size}
            currentUser={currentUser}
            dispatch={dispatch}
            allRatings={allRatings}
          />
        ))}
      </ListLoader>
    );
  }

  render() {
    const {
      location: { pathname },
      intl,
    } = this.props;

    return (
      <Page
        helmet={{
          title: intl.formatMessage({ id: 'catalog.suggestions_meta_title' }),
          description: intl.formatMessage({ id: 'catalog.suggestions_meta_description' }),
          canonical: pathname,
        }}
        header={{ display: true }}
        className="suggestions"
      >
        <Content columns="1">
          <Breadcrumbs
            path={pathname}
            customNames={{
              suggestions: intl.formatMessage({ id: 'games.tab_suggestions' }),
            }}
          />
          <Heading rank={1} withMobileOffset>
            <SimpleIntlMessage id="catalog.suggestions_title" />
          </Heading>
          {this.renderSections()}
        </Content>
      </Page>
    );
  }
}
