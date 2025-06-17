import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import { compose } from 'recompose';
import { connect } from 'react-redux';
import cn from 'classnames';

import './discover-columns.styl';

import throttle from 'lodash/throttle';
import chunk from 'lodash/chunk';
import isFunction from 'lodash/isFunction';

import last from 'ramda/src/last';
import unnest from 'ramda/src/unnest';
import remove from 'ramda/src/remove';
import evolve from 'ramda/src/evolve';

import getPagesCount from 'tools/get-pages-count';

import { appSizeType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';

import { calcDiscoveryLayout, getContainerStyle, getGroupedGames } from './discover-columns.helpers';

const hoc = compose(
  hot,
  connect((state) => {
    return {
      firstRender: state.app.firstRender,
      appSize: state.app.size,
    };
  }),
);

const propTypes = {
  firstRender: PropTypes.bool.isRequired,
  appSize: appSizeType.isRequired,
  items: PropTypes.arrayOf(PropTypes.object),
  itemsCount: PropTypes.number,
  itemsPerPage: PropTypes.number,
  beautifyLines: PropTypes.bool,

  renderItem: PropTypes.func,
  columns: PropTypes.number,
  containerWidth: PropTypes.number,
  className: PropTypes.string,
  groupBy: PropTypes.func,

  section: PropTypes.string,
};

const defaultProps = {
  items: [],
  itemsCount: undefined,
  itemsPerPage: undefined,
  beautifyLines: false,
  columns: undefined,
  containerWidth: undefined,
  renderItem: undefined,
  className: undefined,
  groupBy: undefined,
};

/**
 * Позволяет сделать отображение по колонкам красивым тогда, когда хочется этого добиться.
 * Подробности проблемы: https://3.basecamp.com/3964781/buckets/12803877/todolists/1911089231#__recording_1926831211
 */
const beautifyItems = ({ items, columns, isLastPage, beautifyLines, groupBy }) => {
  if (!beautifyLines || isFunction(groupBy)) {
    return items;
  }

  if (items.length < columns) {
    return items;
  }

  const chunks = chunk(items, columns);
  const lastChunk = last(chunks);

  if (lastChunk && lastChunk.length < columns && !isLastPage) {
    return unnest(remove(chunks.length - 1, 1, chunks));
  }

  return items;
};

const getGroupedItems = ({ itemsArgument, columns, isLastPage, beautifyLines, groupBy }) => {
  if (groupBy) {
    return groupBy(itemsArgument).map(
      evolve({
        items: (itemsArray) => getGroupedGames(itemsArray, columns),
      }),
    );
  }

  const items = beautifyItems({
    items: itemsArgument,
    columns,
    isLastPage,
    beautifyLines,
    groupBy,
  });

  return [
    {
      key: 'default',
      title: '',
      items,
    },
  ];
};

const DiscoverColumnsComponent = ({
  appSize,
  firstRender,
  columns: columnsArgument,
  containerWidth,
  items: itemsArgument,
  itemsCount,
  itemsPerPage,
  beautifyLines,
  renderItem,
  className,
  groupBy,
  section,
}) => {
  /* eslint-disable react/no-array-index-key */

  if (appHelper.isPhoneSize(appSize)) {
    return (
      <div className={cn('discover-columns', className)}>
        {renderItem ? itemsArgument.map(renderItem) : itemsArgument}
      </div>
    );
  }

  const defaultWidth = containerWidth || 1024;
  const [{ columns: columnsState, width }, setLayout] = useState(
    calcDiscoveryLayout(firstRender ? defaultWidth : containerWidth),
  );

  const columns = columnsArgument || columnsState;

  useEffect(() => {
    const onResize = throttle(() => {
      setLayout(calcDiscoveryLayout());
    }, 200);

    window.addEventListener('resize', onResize);

    setLayout(calcDiscoveryLayout());

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const style = useMemo(
    () =>
      getContainerStyle({
        columns,
        containerWidth: containerWidth || width,
        width,
      }),
    [columns, width],
  );

  const pages = getPagesCount(itemsCount, itemsPerPage);
  const page = getPagesCount(itemsArgument.length, itemsPerPage);
  const isLastPage = pages === page;

  const groupedByCategories = useMemo(() => {
    if (section === 'main') {
      const output = [
        {
          key: '0',
          items: [],
          title: '',
        },
        {
          key: '1',
          items: [],
          title: 'Рекомендации',
        },
      ];

      // eslint-disable-next-line no-restricted-syntax
      for (const item of itemsArgument) {
        if (item.props && item.props.game && item.props.game.promo === 'promo') {
          output[0].items.push(item);
        } else {
          output[1].items.push(item);
        }
      }

      return output;
    }

    return getGroupedItems({
      itemsArgument,
      columns,
      isLastPage,
      beautifyLines,
      groupBy,
    });
  }, [itemsArgument, columns, isLastPage, beautifyLines, groupBy]);

  return (Array.isArray(groupedByCategories) ? groupedByCategories : []).map(({ key, title, items }) => {
    if (!items.length) {
      return null;
    }

    return (
      <React.Fragment key={key}>
        {title && <div className="discover-columns-title">{title}</div>}
        <div className={cn('discover-columns', className)} style={style}>
          {items.map((groupGames, idx) => {
            return <React.Fragment key={idx}>{renderItem ? renderItem(groupGames) : groupGames}</React.Fragment>;
          })}
        </div>
      </React.Fragment>
    );
  });
};

DiscoverColumnsComponent.propTypes = propTypes;
DiscoverColumnsComponent.defaultProps = defaultProps;

const DiscoverColumns = hoc(DiscoverColumnsComponent);

export default DiscoverColumns;
