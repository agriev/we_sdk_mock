import cn from 'classnames';
import React, { useEffect, useRef, useState } from 'react';

import PropTypes from 'prop-types';

import SVGInline from 'react-svg-inline';
import IconChevron from 'assets/icons/slider-chevron.svg';

import { Navigation, Pagination } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';

import './games-slider.styl';
import { Link } from 'app/components/link';
import resize from 'tools/img/resize';

const GamesSlider = ({ inline = false, items = [], isPhoneSize, style }) => {
  const [swiper, setSwiper] = useState(null);
  const [sliderProgress, setSliderProgress] = useState(0);

  const requestRef = useRef();
  const previousTimeRef = useRef();

  const [isMounted, setMounted] = useState(false);

  function animateProgress(time) {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;

      setSliderProgress((p) => {
        let newValue = (p + deltaTime * 0.015) % 101;

        if (newValue >= 100) {
          if (swiper) {
            swiper.slideNext();
          }

          newValue = 0;
        }

        return newValue;
      });
    }

    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animateProgress);
  }

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animateProgress);

    return () => {
      previousTimeRef.current = undefined;
      cancelAnimationFrame(requestRef.current);
    };
  }, [swiper]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={cn('games-slider', {
        'games-slider__ready': isMounted,
        'games-slider__inline': inline,
      })}
      style={{
        '--data-progress': `${sliderProgress}%`,
        ...style,
      }}
    >
      <Swiper
        onSwiper={setSwiper}
        onSlideChange={() => {
          setSliderProgress(0);
          previousTimeRef.current = undefined;
        }}
        modules={[Navigation, Pagination]}
        spaceBetween={5}
        centeredSlides
        loop
        navigation={{
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        }}
        slideToClickedSlide
        slidesPerView={1}
        pagination={{ el: '.swiper-pagination', clickable: true }}
        breakpoints={{
          640: {
            slidesPerView: inline ? 1.2 : 2.5,
          },

          1024: {
            autoplay: {
              delay: 3000,
            },

            spaceBetween: 16,
            slidesPerView: inline ? 1.5 : 1.95,
          },

          1500: {
            spaceBetween: 16,
            slidesPerView: inline ? 1.5 : 2.4,
          },

          1800: {
            spaceBetween: 16,
            slidesPerView: inline ? 1.5 : 2.78,
          },
        }}
      >
        <div className="swiper-button-prev">
          <SVGInline svg={IconChevron} />
        </div>

        <div className="swiper-button-next">
          <SVGInline svg={IconChevron} />
        </div>

        {Array.isArray(items) &&
          items.map((item, key) => {
            let utm = 'utm_source=main-carousel&utm_medium=carousel&utm_campaign=crosspromo';

            if (inline) {
              utm = 'utm_source=internal-carousel&utm_medium=carousel&utm_campaign=crosspromo';
            }

            return (
              <SwiperSlide tag="div" key={key}>
                <Link
                  to={`/games/${item.slug}?${utm}`}
                  href={`/games/${item.slug}?${utm}`}
                  key={key}
                  onClick={() => {
                    if (typeof window.yaCounter === 'object') {
                      window.yaCounter.reachGoal(inline ? 'InternalPageCarouselClick' : 'MainCarouselClick');
                    }

                    if (window.gtag) {
                      window.gtag('event', 'recommendation_click', {
                        game_title: item.name,
                        source: inline ? 'gamepage_showcase' : 'main_showcase',
                      });
                    }
                  }}
                >
                  {isPhoneSize ? (
                    <img className="games-slider__image" src={item.image_mobile || item.image} alt="" />
                  ) : (
                    <img
                      className="games-slider__image"
                      src={resize(640, item.image)}
                      srcSet={`${resize(640, item.image)} 1x, ${resize(1280, item.image)} 2x`}
                      alt=""
                    />
                  )}

                  <div className="games-slider__info">
                    <div className="games-slider__title">{item.name}</div>

                    <div className="games-slider__description">
                      <p>{item.description}</p>

                      <div>
                        <div className="games-slider__play">Играть</div>
                      </div>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            );
          })}
      </Swiper>

      {items.length > 1 && (
        <footer className="games-slider__footer">
          <div className="swiper-pagination" />
        </footer>
      )}
    </div>
  );
};

GamesSlider.propTypes = {
  isPhoneSize: PropTypes.bool,
  inline: PropTypes.bool,
  items: PropTypes.array,
  style: PropTypes.object,
};

export default GamesSlider;
