import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import { Helmet } from 'react-helmet-async';
import { onlyUpdateForKeys } from 'recompose';

import config from 'config/config';
import onlyUpdateForKeysDeep from 'tools/only-update-for-keys-deep';

import Art, { artPropTypes } from 'app/ui/art';
import { headerPropTypes } from 'app/ui/header';

const connector = connect((state) => ({
  size: state.app.size,
  locale: state.app.locale,
}));

const updater = onlyUpdateForKeysDeep([
  'children',
  'helmet.title',
  'art.image.path',
  'art.image.color',
  'art.ugly',
  'art.height',
  'art.bottomHeight',
  'size',
]);

export const pagePropTypes = {
  children: PropTypes.oneOfType([PropTypes.shape(), PropTypes.array]).isRequired,
  helmet: PropTypes.shape({
    title: PropTypes.string,
    link: PropTypes.array,
    meta: PropTypes.array,
  }),
  className: PropTypes.string,
  header: PropTypes.shape({
    display: PropTypes.bool,
    ...headerPropTypes,
  }),
  art: PropTypes.oneOfType([PropTypes.bool, PropTypes.shape(artPropTypes)]),
  size: PropTypes.string.isRequired,
};

const defaultProps = {
  helmet: {},
  className: '',
  header: {},
  art: undefined,
};

const HelmetDisplayer = onlyUpdateForKeys(['title'])(
  ({ title, description, image, images, noindex = false, addProjectName = true, canonical, locale }) => {
    const titleString = title ? `${title}${addProjectName ? ' • RAWG' : ''}` : '';
    const descriptionString = description ? description.replace(/<\/?[^>]+(>|$)/g, ' ') : '';
    const { clientAddress } = config;

    return (
      <div>
        {titleString && (
          <Helmet>
            <title>{titleString}</title>
            <meta property="og:title" content={titleString} />
            <meta property="twitter:title" content={titleString} />
          </Helmet>
        )}

        {descriptionString && (
          <Helmet>
            <meta name="description" content={descriptionString} />
            <meta property="og:description" content={descriptionString} />
            <meta property="twitter:description" content={descriptionString.slice(0, 140)} />
          </Helmet>
        )}

        {(image || images) && (
          <Helmet>
            <meta property="og:image" content={images ? images['1200'] : image} />
            <meta property="twitter:image" content={images ? images['1024'] : image} />
            <link rel="image_src" href={images ? images['1200'] : image} />
          </Helmet>
        )}

        {noindex && (
          <Helmet>
            <meta name="robots" content="noindex" />
          </Helmet>
        )}

        {canonical && (
          <Helmet>
            <link rel="canonical" href={`${clientAddress[locale]}${canonical}`} />
          </Helmet>
        )}
      </div>
    );
  },
);

const getClassName = (className) =>
  classnames('page', {
    [className]: className,
  });

const PageAmp = ({ helmet, className, art, size, children }) => (
  <div className={getClassName(className)}>
    <HelmetDisplayer {...helmet} />
    <main className="page__content">{children}</main>
    <div className="page__art">{art && <Art size={size} {...art} />}</div>
  </div>
);

PageAmp.propTypes = pagePropTypes;
PageAmp.defaultProps = defaultProps;

export default connector(updater(PageAmp));
