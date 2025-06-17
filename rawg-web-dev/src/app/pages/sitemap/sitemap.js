import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import { compose } from 'recompose';
import { useIntl, FormattedMessage } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'app/components/link';
import cn from 'classnames';

import get from 'lodash/get';
import toUpper from 'lodash/toUpper';

import path from 'ramda/src/path';

import paths from 'config/paths';
import getPagesCount from 'tools/get-pages-count';
import prepare from 'tools/hocs/prepare';

import './sitemap.styl';

import Page from 'app/ui/page';
import Content from 'app/ui/content';

import ListLoader from 'app/ui/list-loader';

import { loadSitemap, sitemapPageSize } from 'app/pages/sitemap/sitemap.actions';
import Heading from 'app/ui/heading/heading';
import makeRedirect from 'tools/redirect';

import { enLetters, ruLetters } from './sitemap.letters';

const alphabet = {
  ru: [...ruLetters],
  en: [...enLetters],
};

const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const hoc = compose(
  hot,
  prepare(
    async ({ store, params, location }) => {
      const { letter } = params;
      const page = parseInt(get(location, 'query.page', 1), 10);
      const isNum = parseInt(letter, 10) > 0;
      const { locale } = store.getState().app;

      if (!letter) {
        makeRedirect(store.dispatch, paths.sitemap(locale === 'ru' ? 'А' : 'A'));
        return;
      }

      if (!isNum && letter !== '_' && letter === letter.toLowerCase()) {
        makeRedirect(store.dispatch, paths.sitemap(letter.toUpperCase()));
        return;
      }

      await store.dispatch(loadSitemap({ id: letter, page }));
    },
    {
      updateParam: 'letter',
    },
  ),
);

const propTypes = {
  params: PropTypes.shape({
    letter: PropTypes.string,
  }),
};

const defaultProps = {
  //
};

const SitemapPage = ({ params }) => {
  const intl = useIntl();
  const dispatch = useDispatch();

  const currentLetter = params.letter;
  const letterData = useSelector(path(['sitemap', 'letters', currentLetter])) || {};
  const locale = useSelector(path(['app', 'locale']));

  const { count, loading, next, items = [] } = letterData;

  const loadNextPage = useCallback(async () => {
    await dispatch(
      loadSitemap({
        id: currentLetter,
        page: next,
      }),
    );
  }, [next, currentLetter]);

  const renderGame = useCallback(
    (game) => (
      <Link key={game.slug} className="sitemap__game" to={{ pathname: paths.game(game.slug), state: game }}>
        {game.name}
      </Link>
    ),
    [],
  );

  const renderLetter = useCallback(
    (letter) => (
      <Link
        key={letter}
        to={paths.sitemap(letter)}
        className={cn('sitemap__letters__letter', {
          active: letter === toUpper(currentLetter),
          inactive: letter !== toUpper(currentLetter),
        })}
      >
        {letter === '_' ? '#' : letter}
      </Link>
    ),
    [currentLetter],
  );

  return (
    <Page
      helmet={{
        title: intl.formatMessage({ id: 'sitemap.seo_title' }),
        description: intl.formatMessage({ id: 'sitemap.seo_description' }),
      }}
      sidebarProperties={{
        onlyOnPhone: true,
      }}
      className="sitemap-page"
    >
      <Content columns="1">
        <div className="sitemap__letters">
          {alphabet[locale].map(renderLetter)}
          <div className="sitemap__letters__divider" />
          {numbers.map(renderLetter)}
          {renderLetter('_')}
        </div>
        <div className="sitemap__letters">{locale === 'ru' && alphabet.en.map(renderLetter)}</div>
        <Heading className="sitemap__heading" rank={1}>
          <FormattedMessage id="sitemap.heading" values={{ letter: currentLetter }} />
        </Heading>
        <ListLoader
          load={loadNextPage}
          count={count}
          next={next}
          loading={loading}
          pages={getPagesCount(count, sitemapPageSize)}
          showSeoPagination
          isOnScroll
        >
          <div className="sitemap-items">{items.map(renderGame)}</div>
        </ListLoader>
      </Content>
    </Page>
  );
};

SitemapPage.propTypes = propTypes;
SitemapPage.defaultProps = defaultProps;

const Sitemap = hoc(SitemapPage);

export default Sitemap;
