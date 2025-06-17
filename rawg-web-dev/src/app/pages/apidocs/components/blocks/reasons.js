import React from 'react';

import ResponsiveImage from 'app/ui/responsive-image';

import screenshotsImage from '../../assets/images/screenshots.png';
import screenshotsImage2x from '../../assets/images/screenshots@2x.png';
import ratingsImage from '../../assets/images/ratings.png';
import ratingsImage2x from '../../assets/images/ratings@2x.png';
import individualImage from '../../assets/images/individual.png';
import individualImage2x from '../../assets/images/individual@2x.png';
import developersImage from '../../assets/images/developers.png';
import developersImage2x from '../../assets/images/developers@2x.png';
import publishersImage from '../../assets/images/publishers.png';
import publishersImage2x from '../../assets/images/publishers@2x.png';
import tagsImage from '../../assets/images/tags.png';
import tagsImage2x from '../../assets/images/tags@2x.png';

const reasons = [
  {
    title: 'screenshots',
    count: '2,100,000',
    variant: 'black',
    image: screenshotsImage,
    image2x: screenshotsImage2x,
  },
  {
    title: 'ratings',
    count: '1,100,000',
    variant: 'primary',
    image: ratingsImage,
    image2x: ratingsImage2x,
  },
  {
    title: 'developers',
    count: '220,000',
    variant: 'white',
    image: developersImage,
    image2x: developersImage2x,
  },
  {
    title: 'tags',
    count: '58,000',
    variant: 'primary',
    image: tagsImage,
    image2x: tagsImage2x,
  },
  {
    title: 'publishers',
    count: '45,000',
    variant: 'white',
    image: publishersImage,
    image2x: publishersImage2x,
  },
  {
    title: 'people',
    count: '24,000',
    variant: 'black',
    image: individualImage,
    image2x: individualImage2x,
  },
];

// prettier-ignore
export const blockReasons = (
  <div id="why-rawg-api" className="apidocs-reasons">
    <h3 className="apidocs-reasons__subtitle">Why build on RAWG</h3>
    <h2 className="apidocs-reasons__title apidocs-h2">
      500,000+ games for 50 platforms including mobiles
    </h2>
    <div className="apidocs-reasons__list">
      {reasons.map(({ image, image2x, title, count, variant }) => (
        <div className={`apidocs-reasons__reason _${variant}`} key={title}>
          <ResponsiveImage
            className="apidocs-reasons__reason-image"
            image={{ simple: image, retina: image2x }}
            title={title}
            alt={title}
          />
          <p className="apidocs-reasons__reason-text">
            <span className="apidocs-reasons__reason-counter">{count}</span>
            <br />
            {title}
          </p>
        </div>
      ))}
    </div>
    <div className="apidocs-reasons__text-list">
      <div className="apidocs-reasons__left-col">
        <div className="apidocs-reasons__text-reason">
          Comprehensive video game data: descriptions, genres, release dates,
          links to stores, ESRB-ratings, average playtime, gameplay videos,
          Metacritic ratings, official websites, system requirements,
          linked YouTube and Twitch videos, DLCs and franchises.
        </div>
        <div className="apidocs-reasons__text-reason">
          Where to buy: links to digital distribution services.
        </div>
      </div>
      <div className="apidocs-reasons__right-col">
        <div className="apidocs-reasons__text-reason">
          Player activity data: Steam average playtime and RAWG player counts and ratings.
        </div>
        <div className="apidocs-reasons__text-reason">
          Rapidly growing and getting better by user contribution and our algorithms.
        </div>
        <div className="apidocs-reasons__text-reason">
          Similar games based on computer vision.
        </div>
      </div>
    </div>
  </div>
);
