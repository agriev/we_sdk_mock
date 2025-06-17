import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { Helmet } from 'react-helmet-async';

import './game-screenshot.styl';

import noop from 'lodash/noop';

import prepare from 'tools/hocs/prepare';
import resize from 'tools/img/resize';

import CloseButton from 'app/ui/close-button';

import { loadGameScreenshot } from 'app/pages/game/game.actions';

const hoc = compose(
  prepare(async ({ store, params: { id, activeIndex } }) => {
    await store.dispatch(loadGameScreenshot({ gameSlug: id, imgId: activeIndex }));
  }),
);

const propTypes = {
  img: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  onClose: PropTypes.func,
};

const defaultProps = {
  onClose: noop,
};

@hoc
class GameScreenshot extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  imgSizes = [420, 1280, 1920];

  getSrcSet = (url) => this.imgSizes.map((size) => `${resize(size, url)} ${size}w`).join(', ');

  getSizes = () => this.imgSizes.map((size) => `(max-width: ${size}px) ${size}px`).join(', ');

  onClose = () => {
    //
  };

  render() {
    const { img, alt, onClose } = this.props;

    return (
      <div className="game__alone-screenshot">
        <CloseButton className="game__alone-screenshot__close" onClick={onClose} />
        <Helmet>
          <title>{alt}</title>
          <meta name="description" content={alt} />
        </Helmet>
        <img
          srcSet={this.getSrcSet(img)}
          sizes={this.getSizes()}
          className="game__alone-screenshot__img"
          src={resize(1920, img)}
          alt={alt}
          title={alt}
        />
      </div>
    );
  }
}

export default GameScreenshot;
