import React from 'react';
import PropTypes from 'prop-types';
import { pure } from 'recompose';
import { FormattedMessage } from 'react-intl';
import memoizeOne from 'memoize-one';
import { Element } from 'react-scroll';

import SectionHeading from 'app/ui/section-heading';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import imgurLogo from 'assets/icons/imgur-logo.png';

import paths from 'config/paths';

import ViewAll from 'app/ui/vew-all';
import { slug as slugType, imgur as imgurType } from 'app/pages/game/game.types';
import RenderMounted from 'app/render-props/render-mounted';

const componentPropertyTypes = {
  name: PropTypes.string.isRequired,
  slug: slugType,
  imgur: imgurType,
  openViewer: PropTypes.func.isRequired,
};

const componentDefaultProperties = {
  slug: '',
  imgur: {
    results: [],
    count: 0,
  },
};

const getBackground = memoizeOne(({ visible, image }) => {
  if (visible && image && image.thumbnails && image.thumbnails.medium) {
    return {
      backgroundImage: `url(${image.thumbnails.medium})`,
    };
  }

  return undefined;
});

const imgurImg = {
  src: imgurLogo,
  alt: 'imgur',
};

const GameImgurBlock = ({ slug, name, imgur, openViewer }) => {
  const { results, count } = imgur;

  if (results.length === 0) return null;

  const url = paths.gameImgur(slug);

  return (
    <RenderMounted>
      {({ visible, onChildReference }) => (
        <div ref={(element) => onChildReference(element)} className="game__imgur">
          <Element name="imgur" />
          <SectionHeading
            url={url}
            heading={<SimpleIntlMessage id="game.imgur_title" values={{ name }} />}
            image={imgurImg}
            count={<FormattedMessage id="game.imgur_count" values={{ count }} />}
          />
          <div className="game__imgur-content">
            {results.slice(0, 5).map((image, index) => (
              <div
                className="game__imgur-item"
                onClick={openViewer('imgur', index)}
                style={getBackground({ visible, image })}
                key={image.id}
                role="button"
                tabIndex={0}
              >
                <div className="game__imgur-item__hover" style={getBackground({ visible, image })} />
              </div>
            ))}
            {results.length > 5 && <ViewAll countItemsStr="items" size="m" isLabel path={url} />}
          </div>
        </div>
      )}
    </RenderMounted>
  );
};

GameImgurBlock.propTypes = componentPropertyTypes;
GameImgurBlock.defaultProps = componentDefaultProperties;

export default pure(GameImgurBlock);
