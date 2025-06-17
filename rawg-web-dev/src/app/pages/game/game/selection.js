import React from 'react';
import { hot } from 'react-hot-loader/root';
import SVGInline from 'react-svg-inline';

import Platforms from 'app/ui/platforms/platforms';
import MetascoreLabel from 'app/ui/metascore-label/metascore-label';

import IconArrowRight from 'assets/icons/arrow-right.svg';

import './selection.styl';

const DUMMY_DATA = [
  {
    title: 'Stardew Valley',
    rating: 92,
  },
  {
    title: 'Bastion',
    rating: 63,
  },
  {
    title: 'Psychonauts',
    rating: 87,
  },
  {
    title: 'Stardew Valley',
    rating: 92,
  },
  {
    title: 'Bastion',
    rating: 63,
  },
  {
    title: 'Psychonauts',
    rating: 87,
  },
];

@hot
export default class GameSelectionBlock extends React.PureComponent {
  render() {
    return (
      <div className="game-selection">
        <span className="game-selection__title">Играть онлайн</span>
        <span className="game-selection__subtitle">880 игр</span>

        <ul className="game-selection__entries">
          {DUMMY_DATA.map((entry, key) => (
            <a className="game-selection__entry" key={key}>
              <img
                src={`https://api.lorem.space/image/game?w=182&h=104&hash=${key}`}
                alt=""
                className="game-selection__entry-image"
              />

              <div className="game-selection__entry-body">
                <header className="game-selection__entry-header">
                  <Platforms
                    className="game-selection__entry-platforms"
                    parentPlatforms={[
                      { platform: { id: 1, name: 'PC', slug: 'pc' } },
                      { platform: { id: 2, name: 'PlayStation', slug: 'playstation' } },
                      { platform: { id: 3, name: 'Xbox', slug: 'xbox' } },
                    ]}
                    size="medium"
                    maxItems={3}
                  />

                  <MetascoreLabel rating={entry.rating} />
                </header>

                <span className="game-selection__entry-title">{entry.title}</span>
              </div>
            </a>
          ))}
        </ul>

        <a className="game-selection__link">
          Посмотреть все
          <SVGInline svg={IconArrowRight} />
        </a>
      </div>
    );
  }
}
