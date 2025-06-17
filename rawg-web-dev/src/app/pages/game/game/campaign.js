import { AgRuSdkMethods } from '@agru/sdk';

import React, { useEffect, useState, useMemo } from 'react';
import SVGInline from 'react-svg-inline';

import { pure } from 'recompose';

import closeIcon from 'assets/icons/close.svg';

import './campaign.styl';
import BannerAdfox from 'app/pages/app/components/banner-adfox/banner-adfox';
import PropTypes from 'prop-types';

const campaignTypes = {
  default: {
    close: 3,
    total: 6,
  },

  rewarded: {
    close: 6,
    total: 12,
  },
};

const GameCampaignBlock = ({ adfox = [], size }) => {
  const [timerId, setTimerId] = useState(0);

  const [type, setType] = useState('default');
  const [reward, setReward] = useState(false);
  const [visible, setVisible] = useState(false);

  const [count, setCount] = useState(campaignTypes[type].total);
  const [source, setSource] = useState(null);

  const customCampaign = useMemo(() => {
    const output = {};

    const keys = {
      DESKTOP: 'game_desktop',
      DESKTOP_REWARDED: 'game_rewarded_desktop',
      MOBILE_REWARDED: 'game_rewarded_mobile',
      MOBILE: 'game_mobile',
    };

    const defaults = {
      game_desktop: {
        devices: ['desktop', 'tablet'],

        options: {
          isAutoReloads: false,
          phoneWidth: 480,
          tabletWidth: 830,
        },
      },

      game_mobile: {
        devices: ['phone'],

        options: {
          tabletWidth: 830,
          phoneWidth: 480,
          isAutoReloads: false,
        },
      },

      game_rewarded_desktop: {
        devices: ['desktop', 'tablet'],

        options: {
          isAutoReloads: false,
          phoneWidth: 480,
          tabletWidth: 830,
        },
      },

      game_rewarded_mobile: {
        devices: ['phone'],

        options: {
          tabletWidth: 830,
          phoneWidth: 480,
          isAutoReloads: false,
        },
      },
    };

    // eslint-disable-next-line no-restricted-syntax
    for (const entry of adfox) {
      for (const key in entry) {
        if (key in keys) {
          if (!Array.isArray(entry[key])) {
            return;
          }

          const params = entry[key].reduce((acc, cur) => {
            acc[cur.name] = cur.value;
            return acc;
          }, {});

          output[keys[key]] = {
            ...defaults[keys[key]],
            params,
          };
        }
      }
    }

    return output;
  }, [adfox]);

  const bannerType = useMemo(() => {
    if (type === 'rewarded') {
      return size === 'desktop' ? 'game_rewarded_desktop' : 'game_rewarded_mobile';
    }

    return size === 'desktop' ? 'game_desktop' : 'game_mobile';
  }, [size, type]);

  function onMessage(event) {
    const payload = event.data;

    if (typeof payload !== 'object' || Array.isArray(payload)) {
      return;
    }

    if (Array.isArray(payload.data)) {
      return;
    }

    if (payload.type !== AgRuSdkMethods.ShowCampaign) {
      return;
    }

    setSource(event.source);
    setType(payload.data.type);

    setVisible(true);
  }

  useEffect(() => {
    window.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('message', onMessage);
    };
  });

  useEffect(() => {
    setCount(campaignTypes[type].total);
  }, [type]);

  useEffect(() => {
    setReward(false);

    if (source) {
      source.postMessage(
        {
          data: [
            {
              reward,
              status: visible,
              type,
            },
            null,
          ],
          type: 'agru-showCampaign',
        },
        '*',
      );
    }

    clearInterval(timerId);

    if (!visible) {
      return setCount(campaignTypes[type].total);
    }

    setTimerId(
      setInterval(() => {
        setCount((state) => {
          const value = state - 1;

          if (value < 1) {
            if (type === 'rewarded') {
              setReward(true);
            }

            setVisible(false);
            return state;
          }

          return value;
        });
      }, 1e3),
    );
  }, [visible]);

  function onClose() {
    if (type !== 'rewarded') {
      return setVisible(false);
    }

    if (count < campaignTypes.rewarded.total) {
      return setVisible(!window.confirm('Закрыть сейчас и лишиться награды?'));
    }

    setVisible(false);
  }

  if (visible) {
    return (
      <div className="game-campaign">
        <div className="game-campaign__timer">
          <div>
            {type === 'rewarded' ? 'До получения награды' : 'Закроется через'} <span>{count}</span>
          </div>

          {count <= campaignTypes[type].close && (
            <div className="game-campaign__close" onClick={onClose} role="button" tabIndex={0}>
              <SVGInline svg={closeIcon} />
            </div>
          )}
        </div>

        <div className="game-campaign__container">
          {customCampaign[bannerType] ? (
            <BannerAdfox key={size} inlineOptions={customCampaign[bannerType]} />
          ) : (
            <BannerAdfox key={size} type={bannerType} />
          )}
        </div>
      </div>
    );
  }

  return null;
};

GameCampaignBlock.propTypes = {
  adfox: PropTypes.array,
  size: PropTypes.string,
};

export default pure(GameCampaignBlock);
