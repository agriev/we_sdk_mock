import React from 'react';
import { Route, IndexRoute, Redirect } from 'react-router';
import universal from 'react-universal-component';

import memoize from 'lodash/memoize';

import App from 'app/pages/app/app';

import { TopPaths } from 'app/pages/discover/discover.sections';

import universalImportSettings from 'tools/univeral-import-settings';

import env from './env';
import paths from './paths';
import loaders from './routes.loaders';

const activeIndex = ':activeIndex';

const UniversalComponent = universal(({ page }) => loaders[page](), universalImportSettings);

const memoizeOnClient = (func) => {
  if (env.isClient() && env.isProd()) {
    return memoize(func);
  }

  return func;
};

const comp = memoizeOnClient((page, loadedComponent) => {
  const func = (renderProperties) => <UniversalComponent page={page} {...renderProperties} />;

  func.component = loadedComponent;

  return func;
});

// Этот кусок кода нужен для того чтобы реакт роутер v3 дожидался загрузки чанка при
// переходе с одной страницы на другую перед тем как сменить текущую страницу
const getComp = (page) =>
  function loader(nextState, callback) {
    loaders[page]().then((loadedComponent) => {
      // eslint-disable-next-line promise/no-callback-in-promise
      callback(null, comp(page, loadedComponent.default));
    });
  };

export default (
  <Route path="/" component={App}>
    <IndexRoute getComponent={getComp('discoverSections')} />
    <Route path={paths.newMain} getComponent={getComp('discoverMain')} />
    {/* <Redirect from={paths.tldr} to={paths.showcase} /> */}
    <Route path={paths.tldr} getComponent={getComp('showcase')} />
    <Route path={paths.seoPaths} getComponent={getComp('seoPaths')} />
    {/* <Route path={paths.welcome} getComponent={getComp('welcome')} /> */}
    <Route path={paths.dev} getComponent={getComp('dev')} />
    <Route path={paths.showcase} getComponent={getComp('showcase')} />

    {/* <Route path={paths.login} getComponent={getComp('login')} /> */}
    {/* <Route path={paths.register} getComponent={getComp('register')} /> */}
    <Route path={paths.confirmEmail(':token')} getComponent={getComp('confirmEmail')} />
    <Route path={paths.gameAccountsVerification} getComponent={getComp('gameAccountsVerification')} />

    <Redirect from="/rateyourgames" to={paths.rateUserGames} />
    <Route path={paths.rateUserGames} getComponent={getComp('rateUserGames')} />
    <Route path={paths.rateTopGames} getComponent={getComp('rateTopGames')} />

    <Route path={paths.gameAccounts} getComponent={getComp('gameAccounts')} />
    <Route path={paths.accountsImport(':account')} getComponent={getComp('accountsImport')} />
    <Route path={paths.passwordRecovery} getComponent={getComp('passwordRecovery')} />
    <Route path={paths.passwordReset(':uid', ':token')} getComponent={getComp('passwordReset')} />
    <Route path={paths.feedback} getComponent={getComp('feedback')} />
    <Route path={paths.settings} getComponent={getComp('settings')}>
      <IndexRoute getComponent={getComp('settingsInfo')} />
      <Route path={paths.settingsInfo} getComponent={getComp('settingsInfo')} s />
      <Route path={paths.settingsGameAccounts} getComponent={getComp('settingsGameAccounts')} />
      <Route path={paths.settingsGameAccountsVerification} getComponent={getComp('settingsGameAccountsVerification')} />
      <Route path={paths.settingsSocialAccounts} getComponent={getComp('settingsSocialAccounts')} />
      <Route path={paths.settingsNotifications} getComponent={getComp('settingsNotifications')} />
      <Route path={paths.settingsPassword} getComponent={getComp('settingsPassword')} />
      <Route path={paths.settingsEmail} getComponent={getComp('settingsEmail')} />
      <Route path={paths.settingsAdvanced} getComponent={getComp('settingsAdvanced')} />
      <Route path={paths.settingsExport} getComponent={getComp('settingsExport')} />
    </Route>
    <Route path={paths.deleteProfile} getComponent={getComp('settingsDeleteProfile')} />

    <Redirect from={paths.releaseDatesOld1} to={paths.releaseDates} />
    <Redirect from={paths.releaseDatesOld2} to={paths.releaseDates} />
    <Route path={paths.releaseDates} getComponent={getComp('releaseDates')} />
    <Route path={paths.releaseDatesMonth(':year', ':month')} getComponent={getComp('releaseDates')} />
    <Route path={paths.games} getComponent={getComp('gamesRoutes')} ignoreScrollBehavior />
    <Redirect from={paths.gamesCharts} to={paths.discoverSection(TopPaths.allTime)} />
    <Route path={paths.gamesBrowse} getComponent={getComp('browse')} />
    <Route path={paths.gamesSuggestions} getComponent={getComp('suggestions')} />
    <Route
      path={paths.gamesSuggestionsEntity(':id')}
      getComponent={getComp('suggestionsEntity')}
      ignoreScrollBehavior
    />

    <Route path={paths.gameCreateBasic} getComponent={getComp('gameEditCommon')}>
      <IndexRoute getComponent={getComp('gameEditBasic')} />
    </Route>

    <Route path={paths.gameEditBasic(':id')} getComponent={getComp('gameEditCommon')}>
      <IndexRoute getComponent={getComp('gameEditBasic')} />
      <Route path={paths.gameEditScreenshots(':id')} getComponent={getComp('gameEditScreenshots')} />
      <Route path={paths.gameEditStores(':id')} getComponent={getComp('gameEditStores')} />
      <Route path={paths.gameEditTags(':id')} getComponent={getComp('gameEditTags')} />
      <Route path={paths.gameEditCreators(':id')} getComponent={getComp('gameEditCreators')} />
      <Route path={paths.gameEditLinkedGames(':id')} getComponent={getComp('gameEditLinkedGames')} />
    </Route>

    {/* <Route path={paths.ampGame(':id')} component={renderComponent('ampGame')} /> */}
    {/* <Redirect from={paths.ampGame(':id')} to={paths.game(':id')} /> */}

    <Route path={paths.gameScreenshots(':id')} getComponent={getComp('gameScreenshots')} />

    <Route path={paths.gameScreenshotsView(':id', activeIndex)} getComponent={getComp('gameScreenshot')} />

    <Route path={paths.gameSuggestions(':id', {})} getComponent={getComp('gameSuggestions')} />

    <Route path={paths.gameAchievements(':id')} getComponent={getComp('gameAchievements')} />
    <Route path={paths.gameCollections(':id')} getComponent={getComp('gameCollections')} />
    <Route path={paths.gameReviews(':id')} getComponent={getComp('gameReviews')} />
    <Route path={paths.gamePosts(':id')} getComponent={getComp('gamePosts')} />
    <Route path={paths.gameImgur(':id')} getComponent={getComp('gameImgur')} />
    <Route path={paths.gameImgurView(':id', activeIndex)} getComponent={getComp('gameImgur')} />
    <Route path={paths.gameReddit(':id')} getComponent={getComp('gameReddit')} />
    <Route path={paths.gameTwitch(':id')} getComponent={getComp('gameTwitch')} />
    <Route path={paths.gameTwitchView(':id', activeIndex)} getComponent={getComp('gameTwitch')} />
    <Route path={paths.gameYoutube(':id')} getComponent={getComp('gameYoutube')} />
    <Route path={paths.gameYoutubeView(':id', activeIndex)} getComponent={getComp('gameYoutube')} />
    <Route path={paths.gameTeam(':id')} getComponent={getComp('gameTeam')} />
    <Route path={paths.gamePatches(':id')} getComponent={getComp('gamePatches')} />
    <Route path={paths.gamePatch(':id', ':patchId')} getComponent={getComp('gamePatch')} />
    <Route path={paths.gameDemos(':id')} getComponent={getComp('gameDemos')} />
    <Route path={paths.gameDemo(':id', ':demoId')} getComponent={getComp('gameDemo')} />
    <Route path={paths.gameCheats(':id')} getComponent={getComp('gameCheats')} />
    <Route path={paths.gameCheat(':id', ':cheatId')} getComponent={getComp('gameCheat')} />
    <Route path={paths.gameReview(':id')} getComponent={getComp('gameReview')} />

    <Route path={paths.developers} getComponent={getComp('browseListing')} />
    <Route path={paths.publishers} getComponent={getComp('browseListing')} />
    <Route path={paths.tags} getComponent={getComp('browseListing')} />
    <Route path={paths.creators} getComponent={getComp('browseListing')} />
    <Route path={paths.platforms} getComponent={getComp('browseListing')} />
    <Route path={paths.genres} getComponent={getComp('browseListing')} />
    <Route path={paths.stores} getComponent={getComp('browseListing')} />

    <Redirect from={paths.categories} to={paths.index} />
    <Redirect from={paths.category(':slug')} to={paths.index} />

    <Route path={paths.developer(':slug')} getComponent={getComp('gamesStaticFilters')} />
    <Route path={paths.publisher(':slug')} getComponent={getComp('gamesStaticFilters')} />
    <Route path={paths.tag(':slug')} getComponent={getComp('gamesStaticFilters')} />
    <Route path={paths.utag(':slug')} getComponent={getComp('gamesStaticFilters')} />
    <Route path={paths.creator(':id')} getComponent={getComp('person')} />

    <Route path={paths.gamesRoutes} getComponent={getComp('gamesRoutes')} ignoreScrollBehavior />

    <Redirect from="/persons/:id" to={paths.creator(':id')} />
    <Redirect from="/persons" to={paths.creators} />

    <Redirect from={`${paths.profile(':id')}/overview`} to={paths.profile(':id')} />
    {/* <Redirect from={paths.profileGames(':id')} to={paths.profileGamesOwned(':id')} /> */}
    <Route path={paths.profile(':id')} getComponent={getComp('profile')} ignoreScrollBehavior>
      <IndexRoute getComponent={getComp('profileOverview')} ignoreScrollBehavior />
      <Route
        path={paths.profileGamesToPlay(':id', { nested: true })}
        getComponent={getComp('profileGames')}
        customProps="toplay"
        ignoreScrollBehavior
      />
      <Route
        path={paths.profileGames(':id', { nested: true })}
        getComponent={getComp('profileGames')}
        ignoreScrollBehavior
      />

      <Redirect from={paths.profileGamesOwned(':id')} to={paths.profileGames(':id')} />
      <Redirect from={paths.profileGamesDropped(':id')} to={paths.profileGames(':id')} />
      <Redirect from={paths.profileGamesYet(':id')} to={paths.profileGames(':id')} />
      <Redirect from={paths.profileGamesBeaten(':id')} to={paths.profileGames(':id')} />
      <Redirect from={paths.profileGamesPlaying(':id')} to={paths.profileGames(':id')} />
      <Redirect from={paths.profileCollections(':id')} to={paths.profileCollectionsCreated(':id')} />
      <Route
        path={paths.profileCollections(':id', { nested: true })}
        getComponent={getComp('profileCollections')}
        ignoreScrollBehavior
      >
        <Route
          path={paths.profileCollectionsTab(':id', ':tab', { nested: true })}
          getComponent={getComp('profileCollections')}
          ignoreScrollBehavior
        />
      </Route>

      <Redirect from={paths.profileConnections(':id')} to={paths.profileConnectionsFollowing(':id')} />
      <Route
        path={paths.profileConnections(':id', { nested: true })}
        getComponent={getComp('profileConnections')}
        ignoreScrollBehavior
      >
        <Route
          path={paths.profileConnectionsTab(':id', ':tab', { nested: true })}
          getComponent={getComp('profileConnections')}
          ignoreScrollBehavior
        />
      </Route>

      <Route
        path={paths.profileReviews(':id', { nested: true })}
        getComponent={getComp('profileReviews')}
        ignoreScrollBehavior
      />
      <Route
        path={paths.profileDeveloper(':id', { nested: true })}
        getComponent={getComp('profileDeveloper')}
        ignoreScrollBehavior
      />
      <Route
        path={paths.profileApiKey(':id', { nested: true })}
        getComponent={getComp('profileApiKey')}
        ignoreScrollBehavior
      />
    </Route>

    <Route path={paths.collections}>
      <IndexRoute getComponent={getComp('collections')} />
      <Route path={paths.collectionsPopular} getComponent={getComp('collections')} />
      <Route path={paths.collectionCreate} getComponent={getComp('collectionCreate')} />
    </Route>

    <Route path={paths.collection(':id')}>
      <IndexRoute getComponent={getComp('collection')} />
      <Route path={paths.collectionEdit(':id')} getComponent={getComp('collectionEdit')} />
      <Route path={paths.collectionSuggest(':id')} getComponent={getComp('collectionSuggest')} />
      <Route path={paths.collectionAddGames(':id')} getComponent={getComp('collectionAdd')} />
      <Route path={paths.collectionFeedItemText(':id', ':itemId')} getComponent={getComp('collectionFeedItemText')} />
    </Route>

    <Route path={paths.search()} getComponent={getComp('discoverSearch')} />

    <Route path={paths.notifications} getComponent={getComp('activity')} />

    <Route path={paths.reviews} getComponent={getComp('reviews')} />
    {/* <Route path={paths.reviewsBest} getComponent={getComp('reviews')} /> */}

    <Route path={paths.reviewCreate({ redirect: null })} getComponent={getComp('reviewCreate')} />
    <Route path={paths.review(':id')}>
      <IndexRoute getComponent={getComp('review')} />
      <Route path={paths.reviewEdit(':id', null)} getComponent={getComp('reviewEdit')} />
    </Route>

    <Route path={paths.postCreate()} getComponent={getComp('postCreate')} />
    <Route path={paths.post(':id')}>
      <IndexRoute getComponent={getComp('post')} />
      <Route path={paths.postEdit(':id')} getComponent={getComp('postEdit')} />
    </Route>

    {/* <Route path={paths.tokensExchange} getComponent={getComp('tokensExchange')} />
    <Route path={paths.tokensDashboard} getComponent={getComp('tokensDashboard')} /> */}

    <Route path={paths.embeddedStories} getComponent={getComp('embeddedStories')} />

    <Redirect from={paths.discover} to={paths.index} />
    <Route path={paths.discoverSuggestions(':slug')} getComponent={getComp('discoverSuggestions')} />
    <Route path={paths.discoverSection('*')} getComponent={getComp('discoverSections')} />

    <Route path={paths.leaderboard} getComponent={getComp('leaderboard')} />
    <Route path={paths.sitemapIndex} getComponent={getComp('sitemap')} />
    <Route path={paths.sitemap(':letter')} getComponent={getComp('sitemap')} />

    <Route path={paths.internalServerError} getComponent={getComp('internalServerError')} />
    <Route path={paths.notFoundError} getComponent={getComp('notFoundError')} />
    <Route path={paths.privacyPolicy} getComponent={getComp('privacyPolicy')} />
    <Route path={paths.privacy} getComponent={getComp('privacy')} />
    <Route path={paths.agreement} getComponent={getComp('agreement')} />
    <Route path={paths.tosApi} getComponent={getComp('tosApi')} />
    <Route path={paths.apiPurchaseSuccess} getComponent={getComp('apiPurchaseSuccess')} />
    {/* <Route path={paths.agWelcomeBack} getComponent={getComp('agWelcomeBack')} /> */}
    {/* <Route path={paths.apidocs} getComponent={getComp('apidocs')} /> */}
    {/* <Route path={paths.terms} getComponent={getComp('terms')} /> */}
    <Route path={paths.service.ga} getComponent={getComp('serviceGA')} />

    <Route path={paths.giveawayRules} getComponent={getComp('giveawayRules')} />
    {/* НАЧАЛО: Роуты для AG-версии сайта */}
    <Route path={paths.program(':id')} getComponent={getComp('program')} />

    <Route path={paths.pay} getComponent={getComp('pay')} />
    {/* КОНЕЦ: Роуты для AG-версии сайта */}

    <Route path="*" getComponent={getComp('notFoundError')} />
  </Route>
);
