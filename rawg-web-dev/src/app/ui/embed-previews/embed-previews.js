/* eslint-disable camelcase, react/no-danger */
/* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex */

import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import cn from 'classnames';

import resize from 'tools/img/resize';

import appHelper from 'app/pages/app/app.helper';
import { appSizeType } from 'app/pages/app/app.types';

import './embed-previews.styl';

const propTypes = {
  embedData: PropTypes.shape({
    text_attachments: PropTypes.number,
    text_previews: PropTypes.arrayOf(PropTypes.string).isRequired,
  }),

  appSize: appSizeType.isRequired,

  className: PropTypes.string,
  onClick: PropTypes.func,
  path: PropTypes.string,
  visible: PropTypes.bool,
};

const defaultProps = {
  embedData: undefined,
  className: undefined,
  onClick: undefined,
  path: undefined,
  visible: true,
};

const EmbedPreviews = ({ appSize, path, embedData, className, onClick, visible }) => {
  const { text_attachments = 0, text_previews = [] } = embedData || {};
  const textPreviews = text_previews.slice(0, appHelper.isDesktopSize(appSize) ? 4 : 3);

  if (!visible || text_attachments === 0) {
    return null;
  }

  const LinkComponent = path ? Link : 'div';

  return (
    <div className={cn('embed-previews', className)}>
      {textPreviews.map((textPreview, index) => {
        const youTubeRegex = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^"#&?]*).*/;
        const matches = textPreview.match(youTubeRegex);
        const youtubePreview = matches && matches[7] ? `http://i.ytimg.com/vi/${matches[7]}/0.jpg` : undefined;

        return (
          <LinkComponent
            to={path}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            className={cn('embed-previews__preview', { clickable: path || onClick })}
            key={textPreview}
          >
            {textPreview.includes('img') ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: resize(200, textPreview),
                }}
              />
            ) : (
              <div
                className={cn('embed-previews__preview-embed', {
                  'with-img': youtubePreview,
                })}
                style={{
                  backgroundImage: youtubePreview ? `url(${youtubePreview})` : undefined,
                }}
              />
            )}
            {index === textPreviews.length - 1 && text_attachments > textPreviews.length && (
              <div className="embed-previews__preview-count">{`+${text_attachments - textPreviews.length}`}</div>
            )}
          </LinkComponent>
        );
      })}
    </div>
  );
};

EmbedPreviews.propTypes = propTypes;

EmbedPreviews.defaultProps = defaultProps;

export default EmbedPreviews;
