/* eslint-disable sonarjs/cognitive-complexity */

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withRouter } from 'react-router';

import locationShape from 'tools/prop-types/location-shape';

import paths from 'config/paths';

import { makeBeautyLinks, makeQueryLinks } from 'app/ui/select/maybe-linkable/maybe-linkable.helpers';

const hoc = compose(
  withRouter,
  connect((state) => ({
    allGenres: state.app.genres,
    allStores: state.app.stores,
    allPlatforms: state.games.platforms,
    allYears: state.games.years,
    nofollowCollections: state.games.games.nofollow_collections,
  })),
);

const propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.arrayOf(PropTypes.element)]).isRequired,
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    collection: PropTypes.string,
    active: PropTypes.bool,
    clean: PropTypes.bool,
    childs: PropTypes.array,
  }).isRequired,
  linkable: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  filters: PropTypes.shape({}),
  nofollowCollections: PropTypes.arrayOf(PropTypes.string).isRequired,
  urlBase: PropTypes.string,
  location: locationShape.isRequired,
  className: PropTypes.string,
};

const defaultProps = {
  linkable: false,
  urlBase: paths.games,
  filters: undefined,
  className: undefined,
};

const MaybeLinkableComponent = ({
  children,
  item,
  linkable,
  filters,
  nofollowCollections,
  urlBase,
  allGenres,
  allStores,
  allPlatforms,
  allYears,
  location,
  className,
}) => {
  if (linkable) {
    const data = {
      item,
      filters,
      nofollowCollections,
      urlBase,
      children,
      allGenres,
      allStores,
      allPlatforms,
      allYears,
      location,
      className,
    };

    if (linkable === true) {
      return makeBeautyLinks(data);
    }

    if (linkable === 'withQueries') {
      return makeQueryLinks(data);
    }
  }

  return children;
};

MaybeLinkableComponent.propTypes = propTypes;
MaybeLinkableComponent.defaultProps = defaultProps;

const MaybeLinkable = hoc(MaybeLinkableComponent);

export default MaybeLinkable;
