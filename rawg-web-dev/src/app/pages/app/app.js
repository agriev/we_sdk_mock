import { replace } from 'react-router-redux';

import 'react-hot-loader';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { Helmet } from 'react-helmet-async';
import * as Sentry from '@sentry/browser';
import startsWith from 'lodash/startsWith';
import cookies from 'browser-cookies';
import universal from 'react-universal-component';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';

import get from 'lodash/get';

import 'swiper/swiper-bundle.css';
import AppBanners, { bannersDisabled } from 'app/pages/app/components/banners/app.banners';

import universalImportSettings from 'tools/univeral-import-settings';
import getSiteUrl from 'tools/get-site-url';

import { isNewUser, resetIsNewUser } from 'app/pages/login/login.helper';

import SitelinksSearchbox from 'tools/seo/sitelinks-searchbox';

import {
  updateSetting,
  markUserIsStaff,
  loadCurrentUser,
  logout,
  markUserGAuthenticated,
} from 'app/components/current-user/current-user.actions';
import { analyticsEnabled, pageView } from 'scripts/analytics-helper';

import env from 'config/env';
import config from 'config/config';
import loaders from 'config/routes.loaders';
import paths from 'config/paths';
import styleVars from 'styles/vars.json';
import yandexMetrikaScript, { getYMetrikaId } from 'scripts/yandex-metrika';
import googleAnalyticsScript from 'scripts/google-analytics';
import newrelicStagingScript from 'scripts/newrelic/staging';
import newrelicProductionScript from 'scripts/newrelic/production';
import errorHandler from 'scripts/error-handler';
import { ADFOX_INITIAL_SCRIPT } from 'scripts/adfox';

// Чтобы webpack сохранил код этих компонентов в основном общем чанке
// и не размазывал его между остальными чанками
import 'app/ui/page';
import 'app/ui/content';

import './app.styl';

import currentUserType from 'app/components/current-user/current-user.types';
import { appLocaleType, appTokenType, appSizeType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import getPathFromLocation from 'tools/get-path-from-location';
import getBooleanCookie from 'tools/get-boolean-cookie';

import HelpPopup, { helpPopupClosedKey } from 'app/components/help-popup';
import Sidebar from 'app/ui/sidebar';
import WatchFullVideo from 'app/components/watch-full-video';

import BannerAdfox from 'app/pages/app/components/banner-adfox/banner-adfox';
import ProfileIframe from 'app/ui/header/components/profile-iframe/profile-iframe';
import denormalizeGame from 'tools/redux/denormalize-game';
import { AgRuSdkEvents } from '@agru/sdk';
import { isFlutter } from 'tools/is-flutter';
import Notifications from './components/notifications';
import Logger from './components/logger';
import CookieBanner from './components/cookie-banner';
import gameType from '../game/game.types';

import appHelper from './app.helper';

import {
  setStatus,
  markFirstRender,
  resetDisplaySize,
  authSuccess,
  getFeedCounter,
  AUTH_PROVIDER_MESSAGE,
  AUTH_PROVIDER_MESSAGE_ERROR,
  enableAnalytics,
  loadToken,
  setPreviousPage,
  toggleProfileIframeVisibility,
  TOGGLE_PROFILE_IFRAME_VISIBILITY,
} from './app.actions';

import { loadDiscoverLastPlayed, loadDiscoverRecommended, loadSlider } from '../discover/discover.actions';
import { useSDK } from './sdk';

const ASSETS_VERSION = 4;

function mediaName(size) {
  return `_${size}Media`;
}

@hot
@injectIntl
@connect((state) => ({
  game: denormalizeGame(state),
  referer: state.app.request.referer,
  status: state.app.status,
  locale: state.app.locale,
  appSize: state.app.size,
  token: state.app.token,
  firstRender: state.app.firstRender,
  firstPage: state.app.firstPage,
  currentUser: state.currentUser,
  requestCookies: state.app.request.cookies,
  isSpider: state.app.request.isSpider,
  host: state.app.request.headers.host,
  embedded: state.app.embedded,
  profileIframeVisibility: state.app.profileIframeVisibility,
  state,
}))
export default class App extends Component {
  static propTypes = {
    game: gameType.isRequired,
    dispatch: PropTypes.func.isRequired,
    currentUser: currentUserType.isRequired,
    locale: appLocaleType.isRequired,
    token: appTokenType,
    appSize: appSizeType.isRequired,
    location: locationShape.isRequired,
    intl: intlShape.isRequired,
    status: PropTypes.number.isRequired,
    firstRender: PropTypes.bool.isRequired,
    firstPage: PropTypes.bool.isRequired,
    embedded: PropTypes.bool.isRequired,
    children: PropTypes.shape().isRequired,
    referer: PropTypes.string,
    requestCookies: PropTypes.shape(),
    isSpider: PropTypes.bool.isRequired,
    host: PropTypes.string.isRequired,
    profileIframeVisibility: PropTypes.string,
  };

  static defaultProps = {
    referer: null,
    requestCookies: null,
    token: undefined,
  };

  cookieToken = null;

  checkAuthStateIntervalId = null;

  constructor(properties, context) {
    super(properties, context);

    const { currentUser } = this.props;

    this.state = {
      loggerEnabled: false,
      currentUserId: currentUser.id,
      helpPopupClosedFlag: get(currentUser, `settings.${helpPopupClosedKey}`),
      isMount: false,
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.currentUser.id !== state.currentUserId) {
      return {
        currentUserId: props.currentUser.id,
        helpPopupClosedFlag: get(props.currentUser, `settings.${helpPopupClosedKey}`),
      };
    }

    return null;
  }

  // eslint-disable-next-line react/sort-comp
  componentDidCatch = (error, errorInfo) => {
    this.props.dispatch(setStatus(500));

    if (config.sentryEnabled) {
      Sentry.captureException(error, { extra: errorInfo });
    } else {
      /* eslint-disable no-console */
      console.log(error, errorInfo);
    }
  };

  componentDidMount() {
    ['webkitfullscreenchange', 'mozfullscreenchange', 'fullscreenchange'].map((key) =>
      document.addEventListener(key, this.onFullscreenChange),
    );

    const { dispatch, currentUser, referer, host, location, locale } = this.props;

    if (referer && !startsWith(referer, getSiteUrl(locale))) {
      cookies.set('referer', referer, { expires: 30 });
    }

    resetIsNewUser();

    this.cookieToken = cookies.get('token');
    this.checkAuthStateIntervalId = setInterval(this.checkAuthState, 1000);

    this.addMediaQueryListeners();
    this.addMessageListeners();

    this.markFirstRender();

    dispatch(setPreviousPage(getPathFromLocation(location)));

    dispatch(loadSlider());
    dispatch(loadDiscoverRecommended());
    dispatch(loadDiscoverLastPlayed());

    if (appHelper.isStageWebsite(host)) {
      this.setState({ loggerEnabled: true });
    }

    if (analyticsEnabled()) {
      dispatch(enableAnalytics());
    }

    if (appHelper.isStageWebsite(host)) {
      window.DebugAppActions = {
        updateSetting: (key, value) => {
          dispatch(updateSetting(key, value));
        },
      };
    }

    if (currentUser.id) {
      this.processLoggedUser();
    } else {
      this.checkUserToken();
    }

    document.addEventListener(TOGGLE_PROFILE_IFRAME_VISIBILITY, (e) => {
      const { state } = e.detail;

      // if (state.includes('register') && currentUser.id) {
      //   return;
      // }

      dispatch(toggleProfileIframeVisibility({ state }));
    });

    this.setState({ isMount: true });

    this.sdk = useSDK(this);
    window.addEventListener('message', this.onMessage);

    try {
      const { href, origin } = window.location;

      const { pathname = '', search = '' } = window.CLIENT_PARAMS.initialState.routing.locationBeforeTransitions;
      dispatch(replace(pathname + search));

      window.history.replaceState(window.history.state, '', href.replace(origin, ''));
    } catch (error) {
      //
    }
  }

  componentDidUpdate(previousProperties) {
    if (!previousProperties.currentUser.id && this.props.currentUser.id) {
      this.processLoggedUser();
    }

    if (previousProperties.currentUser.id && !this.props.currentUser.id) {
      clearInterval(this.getFeedCounterIntervalId);
      this.getFeedCounterIntervalId = null;
    }

    const currentPath = getPathFromLocation(this.props.location);
    const previousPath = getPathFromLocation(previousProperties.location);

    if (currentPath !== previousPath) {
      this.props.dispatch(setPreviousPage(previousPath));

      // Мы отправляем запрос о смене страницы через 2 секунды,
      // для того чтобы Google Analytics смог взять правильные заголовки
      // с названием страницы вместо старых заголовков.
      setTimeout(() => {
        pageView(currentPath, this.props.embedded);
      }, 2000);
    }

    if (previousProperties.currentUser.id !== this.props.currentUser.id) {
      this.sdk.emit(AgRuSdkEvents.OptionsUpdates);
    }
  }

  componentWillUnmount() {
    this.removeMediaQueryListeners();
    this.removeMessageListeners();

    this.sdk = null;
    window.removeEventListener('message', this.onMessage);

    clearInterval(this.checkAuthStateIntervalId);

    if (typeof window.XPayStationWidget === 'object') {
      const widgets = document.querySelectorAll('.xpaystation-widget-lightbox');
      window.XPayStationWidget.init();

      if (widgets) {
        widgets.forEach((el) => el.remove());
      }
    }
  }

  onFullscreenChange = () => {
    // this.setState((state) => {
    //   return {
    //     ...state,
    //     isFullscreen: document.fullscreen || document.webkitIsFullScreen,
    //   };
    // });
  };

  onMessage = (event) => {
    this.sdk.listen(event);
  };

  onClosePopup = () => {
    this.setState({
      helpPopupClosedFlag: true,
    });
  };

  checkAuthState = () => {
    const { dispatch, location } = this.props;
    const cookieToken = cookies.get('token');

    if (!this.cookieToken && cookieToken && !this.props.currentUser.id) {
      // Если произошла авторизация, и мы находимся на странице рейтингования
      // топ 100 - то нам нужно перезагрузить всю страницу полностью, чтобы
      // сброить весь стейт
      if (location.pathname === paths.rateTopGames && !isNewUser()) {
        // eslint-disable-next-line no-self-assign
        window.location = window.location;
      } else {
        dispatch(loadToken()).then(() => {
          dispatch(loadCurrentUser());
        });
      }
    }

    if (this.cookieToken && !cookieToken && this.props.currentUser.id) {
      dispatch(logout());
    }

    this.cookieToken = cookieToken;
  };

  processLoggedUser() {
    const { dispatch } = this.props;

    dispatch(markUserIsStaff());
    dispatch(markUserGAuthenticated());

    if (!this.getFeedCounterIntervalId) {
      dispatch(getFeedCounter());

      this.getFeedCounterIntervalId = setInterval(() => {
        dispatch(getFeedCounter());
      }, 60 * 1000);
    }
  }

  checkUserToken() {
    const { dispatch, token, currentUser, firstRender } = this.props;

    if (env.isProd() && firstRender && !currentUser.id && token) {
      dispatch(logout());
    }
  }

  getAssetPath = (assetName) => {
    const { locale } = this.props;
    let { assetsPath } = config;

    if (env.isProd()) {
      return `${assetsPath}${locale}/${assetName}?v=${ASSETS_VERSION}`;
    }

    const { clientAddress } = config;
    assetsPath = `${clientAddress[locale]}${assetsPath}${locale}/`;

    return `${assetsPath}${assetName}?v=${ASSETS_VERSION}`;
  };

  addMediaQueryListeners() {
    const { bp } = styleVars;

    Object.keys(bp).forEach((size) => {
      const sizeMediaName = mediaName(size);

      this[sizeMediaName] = window.matchMedia(bp[size]);
      this[sizeMediaName].addListener(this.handleMediaQuery.bind(this, size));
      this.handleMediaQuery(size, this[sizeMediaName]);
    });
  }

  removeMediaQueryListeners() {
    const { bp } = styleVars;

    Object.keys(bp).forEach((size) => {
      if (this[mediaName(size)].removeListener) {
        this[mediaName(size)].removeListener(this.handleMediaQuery.bind(this, size));
      }
    });
  }

  addMessageListeners() {
    window.addEventListener('message', this.handleMessage, false);
  }

  removeMessageListeners() {
    window.removeEventListener('message', this.handleMessage, false);
  }

  markFirstRender() {
    const { dispatch } = this.props;

    dispatch(markFirstRender());
  }

  handleMediaQuery = (size, mediaQueryList) => {
    const { dispatch } = this.props;

    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
      return;
    }

    if (mediaQueryList.matches) dispatch(resetDisplaySize(size));
  };

  handleMessage = ({ data }) => {
    const { dispatch, currentUser } = this.props;

    if (!data) return;

    switch (data.type) {
      case AUTH_PROVIDER_MESSAGE:
        dispatch(authSuccess({ ...data, redirect: !currentUser.id }));
        break;
      case AUTH_PROVIDER_MESSAGE_ERROR:
        dispatch({
          type: AUTH_PROVIDER_MESSAGE_ERROR,
          data,
        });
        break;
      default:
        break;
    }
  };

  renderHeadNewRelic = () => {
    if (config.newRelicFrontendEnable) {
      const newRelicScripts = {
        'frontend-production': newrelicProductionScript,
        'frontend-staging': newrelicStagingScript,
      };

      if (config.newRelicFrontendAppName && newRelicScripts[config.newRelicFrontendAppName]) {
        return <script type="text/javascript">{newRelicScripts[config.newRelicFrontendAppName]}</script>;
      }
    }

    return null;
  };

  renderHeadYandexMetrika = () => {
    const { embedded, locale } = this.props;

    if (env.isProd()) {
      return <script type="text/javascript">{yandexMetrikaScript(embedded, locale)}</script>;
    }

    return null;
  };

  renderUkassa = () => {
    return <script async defer src="https://yookassa.ru/checkout-widget/v1/checkout-widget.js" />;
  };

  renderXsolla = () => {
    return <script async defer src="https://static.xsolla.com/embed/paystation/1.2.6/widget.min.js" />;
  };

  isGaDisabled = () => {
    const { currentUser, requestCookies } = this.props;

    return (
      !config.analyticsEnabled ||
      getBooleanCookie(requestCookies, 'is_staff') ||
      (currentUser.id && currentUser.is_staff)
    );
  };

  isMainPage = () => {
    const { location } = this.props;

    return location.pathname === '/';
  };

  isFullGame() {
    return this.props.location.pathname === '/pay' || this.props.location.pathname.endsWith('/full');
  }

  renderHeadGA1 = () => {
    const { embedded, locale } = this.props;

    if (this.isGaDisabled()) {
      return null;
    }

    return <script type="text/javascript">{googleAnalyticsScript(embedded, locale)}</script>;
  };

  renderHeadGA2 = () => {
    if (this.isGaDisabled()) {
      return null;
    }

    return <script async src="https://www.google-analytics.com/analytics.js" />;
  };

  renderGTM = () => {
    return <script async src="https://www.googletagmanager.com/gtag/js?id=G-KLSSZNB8FM" />;
  };

  renderHeadAdfox = () => {
    const { locale } = this.props;

    if (typeof navigator !== 'undefined' && isFlutter(navigator.userAgent)) {
      return '';
    }

    if (locale === 'ru') {
      return ADFOX_INITIAL_SCRIPT;
    }
  };

  renderHeadYandexMetrikaNoScript = () => {
    const { embedded, locale } = this.props;

    if (env.isProd()) {
      return (
        <noscript key="noscript">
          <div>
            <img
              src={`https://mc.yandex.ru/watch/${getYMetrikaId(embedded, locale)}`}
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>
      );
    }

    return null;
  };

  renderFetchAsGoogleErrorHandler = () => <script type="text/javascript">{errorHandler}</script>;

  renderHead(isAmp) {
    const {
      intl,
      location: { pathname, search },
      isSpider,
      locale,
    } = this.props;

    const { clientAddress } = config;

    const canonicalUrl = isAmp ? `${clientAddress[locale]}${pathname.slice(4)}` : `${clientAddress[locale]}${pathname}`;
    const originalUrl = `${clientAddress[locale]}${pathname}${search}`;

    const title = intl.formatMessage({ id: 'app.head_title' });
    const description = intl.formatMessage({ id: 'app.head_description' });

    return (
      <Helmet>
        <html lang={locale} />
        <meta charSet="utf-8" />

        <meta
          name="viewport"
          content="width=device-width, height=device-height, viewport-fit=cover, initial-scale=1.0, user-scalable=no, maximum-scale=1.0, minimum-scale=1"
        />
        <meta name="google-site-verification" content="PTkW3GHOFVTwgr8Po9NjvmpadMNqy5CbJi2KTlU2k-o" />
        <meta name="yandex-verification" content="0a0e215dcedd73d9" />
        {/* для валидности amp */}
        {/* <meta httpsEquiv="X-UA-Compatible" content="IE=edge" /> */}
        {/* <meta httpsEquiv="cleartype" content="on" /> */}
        <meta name="HandheldFriendly" content="True" />
        <meta name="msapplication-config" content={this.getAssetPath('browserconfig.xml')} />
        <meta name="theme-color" content="#151515" />
        <meta name="msapplication-navbutton-color" content="#151515" />

        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={originalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={this.getAssetPath('share-fb.jpg')} />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
        <meta property="twitter:image" content={this.getAssetPath('share-twitter.jpg')} />
        <meta name="application-name" content="&nbsp;" />
        <meta name="msapplication-TileColor" content="#FFFFFF" />
        <meta name="msapplication-TileImage" content={this.getAssetPath('mstile-144x144.png')} />
        <meta name="msapplication-square70x70logo" content={this.getAssetPath('mstile-70x70.png')} />
        <meta name="msapplication-square150x150logo" content={this.getAssetPath('mstile-150x150.png')} />
        <meta name="msapplication-wide310x150logo" content={this.getAssetPath('mstile-310x150.png')} />
        <meta name="msapplication-square310x310logo" content={this.getAssetPath('mstile-310x310.png')} />
        {!isAmp && isSpider && this.renderFetchAsGoogleErrorHandler()}
        {!isAmp && this.renderHeadNewRelic()}
        {!isAmp && this.renderHeadYandexMetrika()}
        {!isAmp && this.renderHeadGA1()}
        {!isAmp && this.renderHeadGA2()}
        {!isAmp && this.renderHeadAdfox()}
        {!isAmp && this.renderXsolla()}
        {!isAmp && this.renderUkassa()}
        {!isAmp && this.renderGTM()}
        <script>{`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-KLSSZNB8FM');`}</script>
        <script>{`(function(e, x, pe, r, i, me, nt){
e[i]=e[i]||function(){(e[i].a=e[i].a||[]).push(arguments)},
me=x.createElement(pe),me.async=1,me.src=r,nt=x.getElementsByTagName(pe)[0],nt.parentNode.insertBefore(me,nt)})
(window, document, 'script', 'https://abt.s3.yandex.net/expjs/latest/exp.js', 'ymab');
ymab('metrika.19893820', 'init'/*, {clientFeatures}, {callback}*/);`}</script>
        <link rel="canonical" href={canonicalUrl} />
        <link rel="image_src" href={this.getAssetPath('share-vk.png')} />
        {['16x16', '32x32', '96x96', '128x128', '196x196'].map((size) => (
          <link rel="icon" href={this.getAssetPath(`favicon-${size}.png`)} sizes={size} type="image/png" key={size} />
        ))}
      </Helmet>
    );
  }

  renderNotifications() {
    if (this.isFullGame()) {
      return null;
    }

    const { pathname } = this.props.location;

    return <Notifications visible={!bannersDisabled(pathname)} pathname={this.props.location.pathname} />;
  }

  renderLogger() {
    const { loggerEnabled } = this.state;

    if (loggerEnabled) {
      return <Logger />;
    }

    return null;
  }

  renderBanners() {
    if (this.isFullGame()) {
      return null;
    }

    const { requestCookies, currentUser, firstPage, game, location, locale, appSize } = this.props;
    const { pathname } = location;

    const isOnlineGame = game.iframe_url && location.pathname.startsWith('/games/');

    if (isOnlineGame || this.shouldIgnoreBanners(location.pathname)) {
      return null;
    }

    return (
      <div className="app-precontent">
        <AppBanners
          firstPage={firstPage}
          currentPath={pathname}
          requestCookies={requestCookies}
          currentUser={currentUser}
          appLocale={locale}
          appSize={appSize}
          key={appSize}
        />

        <BannerAdfox
          key={appSize + pathname}
          appSize={appSize}
          type={appHelper.isDesktopSize(appSize) ? 'billboard_desktop' : 'billboard_mobile'}
        />
      </div>
    );
  }

  renderCookieBanner() {
    if (this.isFullGame()) {
      return null;
    }

    const { pathname } = this.props.location;

    if (bannersDisabled(pathname)) {
      return null;
    }

    const { locale } = this.props;

    return <CookieBanner locale={locale} />;
  }

  renderContent() {
    const { appSize, status, firstRender, children, location } = this.props;

    let output = children;

    if (!firstRender) {
      switch (status) {
        case 200:
          output = children;
          break;
        case 404: {
          output = universal(loaders.notFoundError(), universalImportSettings);
          break;
        }
        default: {
          output = universal(loaders.internalServerError(), universalImportSettings);
          break;
        }
      }
    }

    if (this.isFullGame()) {
      return output;
    }

    return (
      <div className="app-content">
        {appHelper.isDesktopSize(appSize) && <Sidebar pathname={location.pathname} />}
        <div className="app-content__body">{output}</div>
      </div>
    );
  }

  renderHelpPopup() {
    if (this.isFullGame()) {
      return null;
    }

    const { host, currentUser, location, requestCookies } = this.props;
    const { helpPopupClosedFlag } = this.state;

    const isStage = appHelper.isStageWebsite(host);
    const justRegistered = get(requestCookies, 'just-registered') === 'true';
    const commonChecks = justRegistered && this.isMainPage() && !!currentUser.id && helpPopupClosedFlag !== true;
    const worthShowOnProp = commonChecks;
    const worthShowOnStage = isStage && location.query.info === 'true';

    if (worthShowOnProp || worthShowOnStage) {
      return <HelpPopup onClose={this.onClosePopup} />;
    }

    return null;
  }

  renderWatchFullVideo() {
    return <WatchFullVideo />;
  }

  renderMeta = (isAmp) => {
    const { locale } = this.props;

    return (
      <>
        {this.isMainPage() && <SitelinksSearchbox appLocale={locale} />}
        {!isAmp && this.renderHeadYandexMetrikaNoScript()}
      </>
    );
  };

  shouldIgnoreBanners(pathname) {
    return (
      ['/', '/collections/create', '/licence-users', '/notifications', '/search', '/feedback'].includes(pathname) ||
      pathname.startsWith('/@') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/posts') ||
      pathname.startsWith('/reviews') ||
      pathname.startsWith('/discover')
    );
  }

  renderCatfish() {
    if (this.isFullGame()) {
      return null;
    }

    const { game, location, appSize } = this.props;
    const isOnlineGame = game.iframe_url && location.pathname.startsWith('/games/');

    if (isOnlineGame || this.shouldIgnoreBanners(location.pathname)) {
      return null;
    }

    return (
      <div className="catfish">
        <BannerAdfox
          key={appSize + location.pathname}
          appSize={appSize}
          type={appHelper.isDesktopSize(appSize) ? 'catfish_desktop' : 'catfish_mobile'}
        />
      </div>
    );
  }

  renderFullscreenAd() {
    if (this.isFullGame()) {
      return null;
    }

    const { appSize, game, location } = this.props;

    const isOnlineGame = game.iframe_url && location.pathname.startsWith('/games/');

    if (isOnlineGame || this.shouldIgnoreBanners(location.pathname)) {
      return null;
    }

    return (
      <BannerAdfox
        key={appSize + location.pathname}
        appSize={appSize}
        type={appHelper.isDesktopSize(appSize) ? 'fullscreen_desktop' : 'fullscreen_mobile'}
      />
    );
  }

  render() {
    const { locale, profileIframeVisibility, appSize, game, location } = this.props;
    const { isMount } = this.state;
    // const isAmp = pathname.includes('/amp');
    const isAmp = false;

    let shouldRenderIframe = profileIframeVisibility;

    if (this.props.location.pathname.startsWith('/games/') && this.props.game.iframe_url) {
      shouldRenderIframe = false;
    }

    return (
      <div className={cn('app', `locale-${locale}`)}>
        {this.renderHead(isAmp)}
        {this.renderNotifications()}
        {this.renderLogger()}
        {isMount && this.renderBanners()}
        {this.renderCookieBanner()}
        {this.renderContent()}
        {this.renderHelpPopup()}
        {this.renderWatchFullVideo()}
        {this.renderMeta(isAmp)}
        {this.renderCatfish()}
        {this.renderFullscreenAd()}
        {shouldRenderIframe && <ProfileIframe pathname={location.pathname} game={game} />}
      </div>
    );
  }
}
