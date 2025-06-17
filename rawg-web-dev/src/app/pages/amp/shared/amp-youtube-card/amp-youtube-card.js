/* eslint-disable camelcase */

import React from 'react';
import PropTypes from 'prop-types';
import { pure } from 'recompose';
import { Link } from 'app/components/link';
import cn from 'classnames';

import Time from 'app/ui/time';
import paths from 'config/paths';

const componentPropertyTypes = {
  video: PropTypes.shape({
    name: PropTypes.string,
    created: PropTypes.string,
    channel_title: PropTypes.string,
    thumbnails: PropTypes.object,
  }),
  slug: PropTypes.string,
  kind: PropTypes.oneOf(['big', 'inline']),
  className: PropTypes.string,
  index: PropTypes.number,
};

const componentDefaultProperties = {
  video: undefined,
  slug: '',
  className: '',
  kind: 'big',
  index: undefined,
};

const AmpYoutubeCard = (props) => {
  const { slug, video, kind, className, index } = props;

  const { name, created, channel_title } = video;
  const { thumbnails: videoThumbnail } = video;
  const thumbnail = videoThumbnail[kind === 'big' ? 'medium' : 'default'].url;

  const url = paths.gameYoutubeView(slug, index);

  // aytbc - amp-youtube-card

  return (
    <div className={cn('aytbc', className, kind === 'inline' && 'aytbc__inline')}>
      <Link to={url} href={url}>
        <div className={kind === 'big' ? 'aytbc__big-cont amp-img-cover' : 'aytbc__small-cont amp-img-cover'}>
          <amp-img
            src={thumbnail}
            // width={kind === 'big' ? videoThumbnail.medium.width : '100'}
            // height={kind === 'big' ? videoThumbnail.medium.height : '56'}
            layout="fill"
          />
        </div>
        <div className="aytbc__meta">
          <div className="aytbc__title">{name}</div>
          <div className="aytbc__channel">
            {created && (
              <div className="aytbc__channel-date">
                <Time date={created} />
              </div>
            )}
            {channel_title && <div className="aytbc__channel-separator">&#8226;</div>}
            {channel_title && <div className="aytbc__channel-title">{channel_title}</div>}
          </div>
        </div>
      </Link>
    </div>
  );
};

AmpYoutubeCard.propTypes = componentPropertyTypes;
AmpYoutubeCard.defaultProps = componentDefaultProperties;

export default pure(AmpYoutubeCard);
