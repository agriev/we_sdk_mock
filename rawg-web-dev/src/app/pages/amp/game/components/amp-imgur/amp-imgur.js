import React from 'react';
import { pure } from 'recompose';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';

import ViewAll from 'app/ui/vew-all';
import paths from 'config/paths';
import { slug as slugType, imgur as imgurType } from 'app/pages/game/game.types';

const componentPropertyTypes = {
  slug: slugType,
  imgur: imgurType,
};

const componentDefaultProperties = {
  slug: '',
  imgur: {
    results: [],
    count: 0,
  },
};

const AmpGameImgurBlock = (props) => {
  const { slug, imgur } = props;
  const { results, count } = imgur;

  if (results.length === 0) return null;

  const url = paths.gameImgur(slug);

  return (
    <div className="game__imgur">
      <div className="game__block-title-and-count game__imgur-title">
        <Link className="game__block-title game__block-title_additional" to={url} href={url}>
          <FormattedMessage id="game.imgur" />
          <div className="amp-imgur__title-icon game__block-title-icon" />
        </Link>
        <Link className="game__block-count" to={url} href={url}>
          <FormattedMessage id="game.imgur_count" values={{ count }} />
        </Link>
      </div>
      <div className="game__imgur-carousel">
        <amp-carousel height="80">
          {results.slice(0, 5).map((image, index) => (
            <Link to={paths.gameImgurView(slug, index)} href={paths.gameImgurView(slug, index)} key={image.id}>
              <div className="game__imgur-img-wrap">
                <amp-img width="140" height="80" src={image.thumbnail} />
              </div>
            </Link>
          ))}
          {results.length > 5 && (
            <div className="game__imgur-view-all-wrap">
              <amp-img width="140" height="80" src={{}}>
                <ViewAll className="game__amp-view-all" countItemsStr="items" size="m" isLabel path={url} />
              </amp-img>
            </div>
          )}
        </amp-carousel>
      </div>
    </div>
  );
};

AmpGameImgurBlock.propTypes = componentPropertyTypes;
AmpGameImgurBlock.defaultProps = componentDefaultProperties;

export default pure(AmpGameImgurBlock);
