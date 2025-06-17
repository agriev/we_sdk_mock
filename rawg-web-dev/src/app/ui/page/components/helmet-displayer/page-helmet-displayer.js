import React from 'react';
import PropTypes from 'prop-types';
import { compose, onlyUpdateForKeys } from 'recompose';
import { hot } from 'react-hot-loader/root';

import { Helmet } from 'react-helmet-async';
import truncate from 'lodash/truncate';
import has from 'lodash/has';

import config from 'config/config';
import env from 'config/env';
import resize from 'tools/img/resize';

import { setResponseHeader } from 'app/pages/app/app.actions';
import { appLocaleType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';

const resize1280 = resize(1280);

const hoc = compose(
  hot,
  onlyUpdateForKeys(['title']),
);

const propTypes = {
  appleTouchIcons: PropTypes.array,
  dispatch: PropTypes.func.isRequired,
  title: PropTypes.string,
  addProjectName: PropTypes.bool,
  description: PropTypes.string,
  keywords: PropTypes.string,
  image: PropTypes.string,
  images: PropTypes.arrayOf(PropTypes.object),
  noindex: PropTypes.bool,
  none: PropTypes.bool,
  canonical: PropTypes.string,
  locale: appLocaleType.isRequired,
  location: locationShape.isRequired,
  ogTitle: PropTypes.string,
  ogDescription: PropTypes.string,
  favicon: PropTypes.string,
  manifest: PropTypes.string,
};

const defaultProps = {
  appleTouchIcons: undefined,
  title: undefined,
  addProjectName: true,
  description: undefined,
  keywords: undefined,
  image: undefined,
  images: undefined,
  noindex: false,
  none: false,
  canonical: undefined,
  favicon: undefined,
  manifest: undefined,
};

const HelmetDisplayerComponent = ({
  appleTouchIcons,
  title,
  description,
  keywords,
  image,
  images,
  noindex,
  addProjectName,
  none,
  canonical,
  dispatch,
  locale,
  location,
  ogTitle,
  ogDescription,
  favicon,
  manifest,
}) => {
  const { clientAddress } = config;
  // const projectName = addProjectName && locale !== 'ru';
  const descriptionString = description ? description.replace(/<\/?[^>]+(>|$)/g, ' ') : '';
  const truncatedDescription = truncate(descriptionString, {
    length: Infinity,
    separator: /,?\.* +/,
  });

  const truncatedSeoDescription = truncate((ogDescription || '').replace(/<\/?[^>]+(>|$)/g, ' '), {
    length: Infinity,
    separator: /,?\.* +/,
  });

  const isPageQuery = has(location.query, 'page');

  if (env.isServer() && noindex) {
    dispatch(setResponseHeader('X-Robots-Tag', 'noindex'));
  }

  if (env.isServer() && none) {
    dispatch(setResponseHeader('X-Robots-Tag', 'none'));
  }

  function getAssetPath(assetName) {
    let { assetsPath } = config;

    if (env.isProd()) {
      return `${assetsPath}${locale}/${assetName}?v=4`;
    }

    assetsPath = `${clientAddress[locale]}${assetsPath}${locale}/`;
    return `${assetsPath}${assetName}?v=4`;
  }

  return (
    <>
      {title && (
        <Helmet>
          <title>{title}</title>
          <meta property="og:title" content={ogTitle || title} />
          <meta property="twitter:title" content={ogTitle || title} />
        </Helmet>
      )}

      {descriptionString && (
        <Helmet>
          <meta name="description" content={truncatedDescription} />
          <meta property="og:description" content={truncatedSeoDescription || truncatedDescription} />
          <meta property="twitter:description" content={truncatedSeoDescription || truncatedDescription} />
        </Helmet>
      )}

      {keywords && (
        <Helmet>
          <meta name="keywords" content="" />
        </Helmet>
      )}

      {image && (
        <Helmet>
          <meta property="og:image" content={image} />
          <meta property="twitter:image" content={image} />
          <link rel="image_src" href={image} />
        </Helmet>
      )}

      {noindex && !isPageQuery && (
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
      )}
      {isPageQuery && (
        <Helmet>
          <meta name="robots" content="index, follow" />
        </Helmet>
      )}
      {none && (
        <Helmet>
          <meta name="robots" content="none" />
        </Helmet>
      )}
      {canonical && (
        <Helmet>
          <link rel="canonical" href={`${clientAddress[locale]}${canonical}`} />
        </Helmet>
      )}
      <Helmet>
        <link rel="shortcut icon" href={favicon || '/favicon.ico'} />
      </Helmet>
      <Helmet>
        <link rel="manifest" href={manifest || getAssetPath('manifest.json')} />
      </Helmet>
      <Helmet>
        {appleTouchIcons
          ? appleTouchIcons.map((icon, key) => {
              return <link rel="apple-touch-icon" href={icon.src} sizes={icon.sizes} type={icon.type} key={key} />;
            })
          : ['57x57', '60x60', '72x72', '76x76', '114x114', '120x120', '144x144', '152x152'].map((size) => (
              <link
                rel="apple-touch-icon"
                href={getAssetPath(`apple-touch-icon-${size}.png`)}
                sizes={size}
                type="image/png"
                key={size}
              />
            ))}

        <link
          rel="apple-touch-icon"
          href={(appleTouchIcons || []).length ? appleTouchIcons[0].src : getAssetPath('apple-touch-icon.png')}
        />
      </Helmet>
      {/* {ampLink && (
          <Helmet>
            <link rel="amphtml" href={`${clientAddress}${ampLink}`} />
          </Helmet>
        )} */}
    </>
  );
};

HelmetDisplayerComponent.propTypes = propTypes;
HelmetDisplayerComponent.defaultProps = defaultProps;

const HelmetDisplayer = hoc(HelmetDisplayerComponent);

export default HelmetDisplayer;
