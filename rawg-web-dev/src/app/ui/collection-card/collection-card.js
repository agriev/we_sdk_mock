/* eslint-disable camelcase */

import range from 'lodash/range';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import classnames from 'classnames';
import memoize from 'fast-memoize';

import nameSplit from 'tools/name-split';

import SimpleIntlMessage from 'app/components/simple-intl-message';
import RenderMounted from 'app/render-props/render-mounted';

import paths from 'config/paths';
import resize from 'tools/img/resize';

import './collection-card.styl';

export default class CollectionCard extends Component {
  static propTypes = {
    collection: PropTypes.shape().isRequired,
    className: PropTypes.string,
    kind: PropTypes.oneOf(['block', 'inline']),
  };

  static defaultProps = {
    className: '',
    kind: undefined,
  };

  constructor(props) {
    super(props);

    this.getBackgroundImage = memoize(this.getBackgroundImage);
  }

  getClassName() {
    const { className, kind } = this.props;

    return classnames('collection-card', {
      [`collection-card_${kind}`]: kind,
      [className]: className,
    });
  }

  getBackgroundImage = (url, visible) => (url && visible ? { backgroundImage: `url(${resize(200, url)})` } : undefined);

  render() {
    const { collection = {}, kind } = this.props;
    const { slug, name, games_count, likes_count, backgrounds, noindex } = collection;
    let { games } = collection;

    games =
      games ||
      (Array.isArray(backgrounds)
        ? backgrounds.map((background, index) => ({
            ...background,
            background_image: background.url,
            title: '',
            id: `${background.url}${index}`,
          }))
        : []);

    return (
      <RenderMounted>
        {({ visible, onChildReference }) => (
          <div className={this.getClassName()} ref={(reference) => onChildReference(reference)}>
            <div className="collection-card__games">
              {games.map((game, index) => {
                const backgroundImage = this.getBackgroundImage(game.background_image, visible);

                return (
                  <div className="collection-card__game" style={backgroundImage} key={game.id}>
                    {kind === 'block' && <div className="collection-card__game__hover" style={backgroundImage} />}
                    {index === 3 && games_count > 3 && (
                      <div className="collection-card__plus-count">{`+${games_count - 3}`}</div>
                    )}
                  </div>
                );
              })}
              {range(Math.max(0, 4 - games.length)).map((index) => (
                <div className="collection-card__game" key={index} />
              ))}
            </div>
            <div className="collection-card__meta">
              <div className="collection-card__title">{nameSplit(name, 30)}</div>
              <div className="collection-card__count">
                <SimpleIntlMessage id="shared.collection_card_count" values={{ gamesCount: games_count || '0' }} />
              </div>
              <div className="collection-card__count">
                {likes_count}{' '}
                <SimpleIntlMessage id="collection.card_meta_amount_cakes" values={{ count: likes_count || 0 }} />
              </div>
            </div>
            <Link
              rel={noindex ? 'nofollow' : undefined}
              className="collection-card__link"
              to={paths.collection(slug)}
              href={paths.collection(slug)}
            />
          </div>
        )}
      </RenderMounted>
    );
  }
}
