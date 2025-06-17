import React from 'react';
import PropTypes from 'prop-types';

import ListLoader from 'app/ui/list-loader';
import CollectionCardsList from 'app/ui/collection-cards-list';

import './collections-list.styl';

import { collectionsListTypes } from 'app/pages/collections/collections.types';
import getPagesCount from 'tools/get-pages-count';

const collectionsPropertyTypes = {
  collections: collectionsListTypes.isRequired,
  loadCollections: PropTypes.func.isRequired,
  pageSize: PropTypes.number.isRequired,
};

const CollectionsList = (props) => {
  const { collections, loadCollections, pageSize } = props;

  return (
    <div className="collections-list">
      <ListLoader
        load={loadCollections}
        count={collections.count}
        next={collections.next}
        loading={collections.loading}
        pages={getPagesCount(collections.count, pageSize)}
        isOnScroll
      >
        <CollectionCardsList collections={collections.results} kind="common" />
      </ListLoader>
    </div>
  );
};

CollectionsList.propTypes = collectionsPropertyTypes;

export default CollectionsList;
