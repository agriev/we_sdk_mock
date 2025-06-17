import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import cn from 'classnames';
import { onlyUpdateForKeys } from 'recompose';

import LoadMore from 'app/ui/load-more';
import CollectionCardsList from 'app/ui/collection-cards-list';
import Heading from 'app/ui/heading';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import paths from 'config/paths';

import { loadCollections } from 'app/pages/showcase/showcase.actions';

import './collections.styl';

import { appSizeType } from 'app/pages/app/app.types';

const connector = connect((state) => ({
  collections: state.showcase.collections,
  appSize: state.app.size,
}));

const updater = onlyUpdateForKeys(['collections', 'isSeo']);

export const componentPropTypes = {
  appSize: appSizeType.isRequired,
  className: PropTypes.string,
  collections: PropTypes.shape({
    count: PropTypes.number,
    next: PropTypes.number,
    loading: PropTypes.bool,
    results: PropTypes.array,
  }),
  dispatch: PropTypes.func.isRequired,
  isSeo: PropTypes.bool.isRequired,
};

export const componentDefaultProps = {
  className: '',
  collections: {},
};

const makeClassName = (className) => cn('showcase-collections', { [className]: className });

const ShowcaseCollections = ({ collections, className, dispatch, isSeo, appSize }) => {
  const { count, next, loading, results } = collections;

  const load = () => dispatch(loadCollections(collections.next));

  if (!Array.isArray(results) || results.length === 0) return null;

  return (
    <div className={makeClassName(className)}>
      <Heading rank={2} centred>
        <Link to={paths.collectionsPopular} path={paths.collectionsPopular}>
          <SimpleIntlMessage id="showcase.collections_title" />
        </Link>
      </Heading>
      {isSeo ? (
        <CollectionCardsList collections={results} kind="common" />
      ) : (
        <LoadMore appSize={appSize} load={load} count={count} next={next} loading={loading}>
          <CollectionCardsList collections={results} kind="common" />
        </LoadMore>
      )}
    </div>
  );
};

ShowcaseCollections.propTypes = componentPropTypes;
ShowcaseCollections.defaultProps = componentDefaultProps;

export default connector(updater(ShowcaseCollections));
