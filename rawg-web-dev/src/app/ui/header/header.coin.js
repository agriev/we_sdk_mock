import cn from 'classnames';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import SvgInline from 'react-svg-inline';
import plural from 'plural-ru';
import PropTypes from 'prop-types';

import appHelper from 'app/pages/app/app.helper';
import { grabLoyaltyBonuses } from 'app/components/current-user/current-user.actions';
import iconBalance from './assets/coin/balance.svg';
import iconChest from './assets/coin/chest.svg';
import iconChevron from './assets/coin/chevron.svg';
import iconCurrency from './assets/coin/currency.svg';
import iconDay from './assets/coin/day.svg';
import iconHeart from './assets/coin/heart.svg';
import iconHot from './assets/coin/hot.svg';
import iconPoint from './assets/coin/point.svg';

import iconUpdate from './assets/coin/update.svg';

import iconTimelineDone from './assets/coin/timeline-done.svg';
import iconTimelineNone from './assets/coin/timeline-none.svg';
import iconTimelineProgress from './assets/coin/timeline-progress.svg';

import iconX from './assets/x.svg';
import iconWinningAmount from './assets/coin/winning-amount.svg';

export const HEADER_COIN_COOKIE = 'headercoin';
export const HEADER_NOTIFICATION_COOKIE = 'headerstatus';

function formatBalance(value) {
  return new Intl.NumberFormat('ru').format(value).replace(',', '.');
}

export const HeaderCoin = ({ balance = 0, notification = false, onClick }) => {
  const formattedBalance = useMemo(() => {
    if (balance < 1000) {
      return formatBalance(balance);
    }

    return new Intl.NumberFormat('en', { notation: 'compact' }).format(balance);
  }, [balance]);

  return (
    <div className="header-coin" onClick={onClick} role="button" tabIndex={0}>
      <div className="coin-balance">
        <div className={cn('coin-balance__icon', notification && 'coin-balance__icon--with-status')}>
          <SvgInline svg={iconBalance} />
        </div>

        <span className="coin-balance__amount">{formattedBalance}</span>
      </div>
    </div>
  );
};

HeaderCoin.propTypes = {
  balance: PropTypes.number,
  notification: PropTypes.bool,
  onClick: PropTypes.func,
};

export const HeaderCoinDay = ({ day }) => {
  return (
    <div className={cn('coin-informer-week__day', `coin-informer-week__day--${day.type || 'none'}`)}>
      {day.type === 'life' && <SvgInline className="coin-informer-week__day-heart" svg={iconHeart} />}
      <SvgInline className="coin-informer-week__day-bg" svg={iconDay} />
      <span className="coin-informer-week__day-text">{day.value}</span>

      {!!day.tooltip && <div className="coin-informer-week__tooltip">{day.tooltip}</div>}
    </div>
  );
};

HeaderCoinDay.propTypes = {
  day: PropTypes.object,
};

export const HeaderCoinPoint = ({ point }) => {
  return (
    <SvgInline
      className={cn('coin-informer-footer__point', `coin-informer-footer__point--${point.type}`)}
      svg={iconPoint}
    />
  );
};

HeaderCoinPoint.propTypes = {
  point: PropTypes.object,
};

export const HeaderCoinWeek = ({ week }) => {
  const header = useMemo(() => {
    const output = {
      title: '',
      subtitle: 'Нужно заходить на сайт не <br>менее 3-х раз на протяжении 7 дней',
    };

    const numbers = {
      1: {
        title: 'Первая неделя',
        subtitle: 'Нужно заходить на сайт каждый день на протяжении 7 дней',
      },

      2: {
        title: 'Вторая неделя',
      },

      3: {
        title: 'Третья неделя',
      },

      4: {
        title: 'Четвертая неделя',
      },

      5: {
        title: 'Пятая неделя',
      },
    };

    Object.assign(output, numbers[week.number] || {});

    if (week.type === 'progress') {
      output.title += ' (текущая)';
    }

    return output;
  }, [week]);

  const timelineIcon = useMemo(() => {
    if (week.type === 'done') {
      return iconTimelineDone;
    }

    if (week.type === 'progress') {
      return iconTimelineProgress;
    }

    return iconTimelineNone;
  }, [week]);

  return (
    <div className="coin-informer-week">
      <div className="coin-informer-week__status">
        <div className="coin-informer-week__status-icon">
          <SvgInline svg={timelineIcon} />
        </div>

        <div className="coin-informer-week__status-line" />
      </div>

      <div className="coin-informer-week__content">
        <div className="coin-informer-week__title">{header.title}</div>
        <div className="coin-informer-week__subtitle" dangerouslySetInnerHTML={{ __html: header.subtitle }} />

        <div className="coin-informer-week__days">
          {week.days.map((day) => (
            <HeaderCoinDay day={day} key={day.value} />
          ))}
        </div>
      </div>
    </div>
  );
};

HeaderCoinWeek.propTypes = {
  week: PropTypes.object,
};

export const HeaderCoinAccordion = ({ title, subtitle }) => {
  const [isOpened, setOpened] = useState(false);

  return (
    <div
      className={cn('coin-informer-accordion', {
        'coin-informer-accordion--opened': isOpened,
      })}
      role="button"
      tabIndex={0}
      onClick={() => setOpened(!isOpened)}
    >
      <header className="coin-informer-accordion__header">
        <span>{title}</span>
        <SvgInline svg={iconChevron} />
      </header>

      <div
        className="coin-informer-accordion__content"
        style={isOpened ? {} : { display: 'none' }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: subtitle }}
      />
    </div>
  );
};

HeaderCoinAccordion.propTypes = {
  subtitle: PropTypes.string,
  title: PropTypes.string,
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export const HeaderCoinInformer = ({
  appSize,
  balance = 0,
  isAuthorized = false,
  loyalty,
  onClose,
  onRegisterClick,
}) => {
  const rootRef = useRef(null);
  const dispatch = useDispatch();

  const weeks = useMemo(() => {
    let output = [];

    if (!loyalty || !loyalty.logins) {
      return output;
    }

    output = loyalty.logins.map((login, day) => {
      let type = 'missed';
      let tooltip = 'Пропущенный день';

      if (login.used_save) {
        type = 'life';
        tooltip = 'Потрачена жизнь';
      } else if (login.hot_streak) {
        type = 'hot';
        tooltip = '';
      } else if (login.is_visited) {
        type = 'done';
        tooltip = '';
      }

      return {
        value: day + 1,
        tooltip,
        type,
      };
    });

    output = [
      ...output,
      ...Array.from({ length: loyalty.duration - output.length }, (_, day) => {
        return {
          type: 'none',
          value: day + 1 + output.length,
        };
      }),
    ];

    const chunkSize = 7;
    const activeWeek = Math.ceil(loyalty.completed_days / 7) || 1;

    let weekNumber = 1;

    return output.reduce((acc, _, i) => {
      if (i % chunkSize === 0) {
        let type = 'none';

        if (weekNumber === activeWeek) {
          type = 'progress';
        } else if (weekNumber < activeWeek) {
          type = 'done';
        }

        acc.push({
          days: output.slice(i, i + chunkSize),
          // eslint-disable-next-line no-plusplus
          number: weekNumber++,
          type,
        });
      }

      return acc;
    }, []);
  }, [loyalty]);

  const missedDays = useMemo(() => {
    let output = 0;

    if (!loyalty || !loyalty.logins) {
      return output;
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const login of loyalty.logins) {
      if (!login.is_visited) {
        // eslint-disable-next-line no-plusplus
        output++;
      }
    }

    return output;
  }, [loyalty]);

  function onClickOutside(event) {
    if (rootRef.current.contains(event.target)) {
      return;
    }

    return onClose && onClose();
  }

  useEffect(() => {
    window.addEventListener('click', onClickOutside);

    return () => {
      window.removeEventListener('click', onClickOutside);
    };
  }, [rootRef]);

  return (
    <div
      className={cn('coin-informer', isAuthorized && 'coin-informer--authorized')}
      ref={rootRef}
      onClick={() => onClose && onClose()}
      role="button"
      tabIndex={0}
    >
      <div className="coin-informer__body" onClick={(event) => event.stopPropagation()} role="button" tabIndex={0}>
        <div className="coin-informer__content">
          <header className="coin-informer__header">
            {loyalty.can_accept ? (
              <>
                <div className="coin-informer__title">Миссия выполнена!</div>
                <span className="coin-informer__subtitle">
                  За {weeks.length} {plural(weeks.length, 'неделю', 'недели', 'недель')} тебе удалось собрать{' '}
                  {loyalty.full_bonus} AGolds. Забирай монеты, потрать их в любимых играх и возвращайся за новыми
                  наградами!
                </span>
              </>
            ) : (
              <>
                <div className="coin-informer__title">Заходи на платформу и получай AGold!</div>
                {isAuthorized ? (
                  <span className="coin-informer__subtitle">Трать монеты на покупки в любых играх на платформе.</span>
                ) : (
                  <>
                    <div className="coin-informer-winner__body coin-informer-winner__body--preview" />

                    <span className="coin-informer__subtitle">
                      AGold – это бонусные монеты игровой платформы AG.ru
                      <br />
                      <br />
                      Зарегистрированные пользователи получают AGold за вход на сайт и тратят их на покупки в любых
                      играх на платформе.
                      <br />
                      <br />
                      Присоединяйся!
                    </span>
                  </>
                )}
              </>
            )}
          </header>

          {loyalty.duration && isAuthorized ? (
            <>
              {loyalty.can_accept ? (
                <>
                  {appHelper.isPhoneSize(appSize) && (
                    <section className="coin-informer__section">
                      <div className="coin-informer-footer__balance">
                        <SvgInline svg={iconChest} />

                        <div className="coin-informer-footer__balance-body">
                          {/* eslint-disable-next-line sonarjs/no-duplicate-string */}
                          <div className="coin-informer-footer__balance-key">Твой баланс</div>

                          <div className="coin-informer-footer__balance-value">
                            {formatBalance(balance)} <SvgInline svg={iconCurrency} />
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  <section className="coin-informer__section coin-informer-stats">
                    <div className="coin-informer-stats__items">
                      <div className="coin-informer-stats__item">
                        <span className="coin-informer-stats__item-key">Пройдено:</span>
                        <span className="coin-informer-stats__item-value">
                          {loyalty.logins.length} из {loyalty.duration}
                        </span>
                      </div>

                      <div className="coin-informer-stats__item">
                        <span className="coin-informer-stats__item-key">Комбо:</span>
                        <div className="coin-informer-stats__item-value">
                          {loyalty.amount_hot_streak_days || 0}{' '}
                          {plural(loyalty.amount_hot_streak_days, 'день', 'дня', 'дней')}{' '}
                          <span className="coin-informer-stats__item-delimiter">/</span> +{loyalty.hot_streak_bonus}{' '}
                          <SvgInline className="coin-informer-stats__currency" svg={iconCurrency} />
                        </div>
                      </div>

                      <div className="coin-informer-stats__item">
                        <span className="coin-informer-stats__item-key">Жизни:</span>

                        <div className="coin-informer-stats__hearts">
                          {Array.from({ length: 2 }, (_, i) => (
                            <SvgInline
                              className={loyalty.lives && i + 1 <= loyalty.lives && 'coin-informer-stats__heart'}
                              key={i}
                              svg={iconHeart}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="coin-informer-stats__item">
                        <span className="coin-informer-stats__item-key">Заработано:</span>
                        <span className="coin-informer-stats__item-value">
                          {loyalty.full_bonus}{' '}
                          <SvgInline className="coin-informer-stats__currency" svg={iconCurrency} />
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="coin-informer__section coin-informer-winner">
                    <div className="coin-informer-winner__body">
                      <div className="coin-informer-winner__amount">
                        <SvgInline svg={iconWinningAmount} />

                        <div className="coin-informer-winner__amount-text">
                          {loyalty.full_bonus}
                          <SvgInline svg={iconCurrency} width="32" height="32" />
                        </div>
                      </div>
                    </div>

                    {appHelper.isDesktopSize(appSize) && (
                      <div
                        role="button"
                        tabIndex={0}
                        className="coin-informer__button"
                        onClick={() => dispatch(grabLoyaltyBonuses())}
                      >
                        Забрать
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <>
                  <section className="coin-informer__section coin-informer-stats">
                    <SvgInline className="coin-informer-stats__chest" svg={iconChest} />

                    <div className="coin-informer-stats__items">
                      <div className="coin-informer-stats__item">
                        <span className="coin-informer-stats__item-key">Твой баланс:</span>
                        <span className="coin-informer-stats__item-value">
                          {formatBalance(balance)}{' '}
                          <SvgInline className="coin-informer-stats__currency" svg={iconCurrency} />
                        </span>
                      </div>

                      <div className="coin-informer-stats__item">
                        <span className="coin-informer-stats__item-key">Пройдено:</span>
                        <span className="coin-informer-stats__item-value">
                          {loyalty.completed_days} из {loyalty.duration}
                        </span>
                      </div>

                      <div className="coin-informer-stats__item">
                        <span className="coin-informer-stats__item-key">Заработано:</span>
                        <span className="coin-informer-stats__item-value">
                          {loyalty.full_bonus}{' '}
                          <SvgInline className="coin-informer-stats__currency" svg={iconCurrency} />
                        </span>
                      </div>

                      <div className="coin-informer-stats__item">
                        <span className="coin-informer-stats__item-key">Пропущено:</span>
                        <span className="coin-informer-stats__item-value">{missedDays}</span>
                      </div>

                      <div className="coin-informer-stats__item">
                        <span className="coin-informer-stats__item-key">Жизни:</span>

                        <div className="coin-informer-stats__hearts">
                          {/* eslint-disable-next-line sonarjs/no-identical-functions */}
                          {Array.from({ length: 2 }, (_, i) => (
                            <SvgInline
                              className={
                                (loyalty.lives && i + 1 <= loyalty.lives && 'coin-informer-stats__heart') || ''
                              }
                              key={i}
                              svg={iconHeart}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="coin-informer__section coin-informer-hotstreak">
                    <SvgInline className="coin-informer-hotstreak__hot" svg={iconHot} />

                    <div className="coin-informer-hotstreak__body">
                      <span>Комбо:</span>

                      <div className="coin-informer-hotstreak__value">
                        <span>
                          {loyalty.amount_hot_streak_days}{' '}
                          {plural(loyalty.amount_hot_streak_days, 'день', 'дня', 'дней')}
                        </span>

                        <div className="coin-informer-hotstreak__balance">
                          +{loyalty.hot_streak_bonus}{' '}
                          <SvgInline className="coin-informer-stats__currency" svg={iconCurrency} />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="coin-informer__section coin-informer-weeks">
                    {weeks.map((week, weekKey) => (
                      <HeaderCoinWeek key={weekKey} week={week} />
                    ))}
                  </section>
                </>
              )}
            </>
          ) : isAuthorized ? (
            <>
              {appHelper.isDesktopSize(appSize) && (
                <section className="coin-informer__section">
                  <div className="coin-informer-footer__balance">
                    <SvgInline svg={iconChest} />

                    <div className="coin-informer-footer__balance-body">
                      <div className="coin-informer-footer__balance-key">Твой баланс</div>

                      <div className="coin-informer-footer__balance-value">
                        {formatBalance(balance)} <SvgInline svg={iconCurrency} />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section className="coin-informer__section coin-informer-update">
                <SvgInline svg={iconUpdate} />
                <div className="coin-informer-update__text">Новый этап игры можно начать с завтрашнего дня.</div>
              </section>
            </>
          ) : (
            appHelper.isDesktopSize(appSize) && (
              <section className="coin-informer__section coin-informer__section--register">
                <div
                  role="button"
                  tabIndex={0}
                  className="coin-informer__button"
                  onClick={() => onRegisterClick && onRegisterClick()}
                >
                  Зарегистрироваться
                </div>
              </section>
            )
          )}

          {isAuthorized && (
            <section className="coin-informer__section coin-informer-faq">
              <div className="coin-informer-faq__title">FAQ</div>

              <div className="coin-informer-faq__items">
                <HeaderCoinAccordion
                  title="Что нужно делать?"
                  subtitle={`Заходи на AG.ru и получай AGold в награду!<br><br>Копи монеты, чтобы потратить их на покупки в любых играх на платформе.<br><br>Цикл активности составляет ${
                    weeks.length
                  } ${plural(
                    weeks.length,
                    'неделю',
                    'недели',
                    'недель',
                  )} и начинается с твоего первого посещения.<br><br>Каждую неделю необходимо зайти на платформу определенное количество раз, чтобы получить монеты.<br><br>После окончания цикла ты забираешь накопленные AGold, а цикл активности стартует заново.`}
                />

                <HeaderCoinAccordion
                  title="Что такое AGold?"
                  subtitle="AGold – это бонусные монеты платформы AG.ru, 1 AGold = 1 рублю.<br><br>AGold сгорают, если не потратить их в течение 30 дней после получения."
                />

                <HeaderCoinAccordion
                  title="Что такое Комбо?"
                  subtitle="Заходи чаще, чтобы активировать Комбо. Активное Комбо добавляет +15% к награде и позволит тебе в конце цикла получить еще больше AGold!<br><br>В первую неделю для активации Комбо потребуется зайти на платформу от 2х дней подряд. Во вторую неделю – необходимо зайти не менее 3х раз на протяжении 7 дней."
                />

                <HeaderCoinAccordion
                  title="Трата AGold"
                  subtitle="Если монеты AGold есть на счету, они автоматически будут вычитаться из стоимости внутриигровых покупок при платежах в онлайн-играх.<br><br>Максимальная скидка в монетах AGold составляет 50% от стоимости заказа."
                />

                <HeaderCoinAccordion
                  title="Что, если я пропущу день?"
                  subtitle="При пропуске дней у тебя тратятся Жизни.<br><br>Ты можешь пропустить день и при этом сохранить свою серию заходов, но только 2 раза за цикл."
                />
              </div>
            </section>
          )}
        </div>

        <footer className="coin-informer-footer">
          {/* eslint-disable-next-line no-nested-ternary */}
          {!isAuthorized ? (
            <div
              tabIndex={0}
              role="button"
              className="coin-informer__button"
              onClick={() => onRegisterClick && onRegisterClick()}
            >
              Зарегистрироваться
            </div>
          ) : loyalty.can_accept ? (
            <div
              tabIndex={0}
              role="button"
              className="coin-informer__button"
              onClick={() => dispatch(grabLoyaltyBonuses())}
            >
              Забрать
            </div>
          ) : loyalty.duration ? (
            <div className="coin-informer-footer__points">
              {weeks
                .reduce((acc, week) => {
                  acc.push(...week.days);
                  return acc;
                }, [])
                .map((day, key) => (
                  <HeaderCoinPoint key={key} point={day} />
                ))}
            </div>
          ) : (
            <div className="coin-informer-footer__balance">
              <SvgInline svg={iconChest} />

              <div className="coin-informer-footer__balance-body">
                <div className="coin-informer-footer__balance-key">Твой баланс</div>

                <div className="coin-informer-footer__balance-value">
                  {formatBalance(balance)} <SvgInline svg={iconCurrency} />
                </div>
              </div>
            </div>
          )}

          {appHelper.isPhoneSize(appSize) && (
            <div className="coin-informer-footer__close" onClick={onClose} role="button" tabIndex={0}>
              <SvgInline svg={iconX} />
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

HeaderCoinInformer.propTypes = {
  appSize: PropTypes.string,
  balance: PropTypes.number,
  isAuthorized: PropTypes.bool,
  loyalty: PropTypes.object,
  onClose: PropTypes.func,
  onRegisterClick: PropTypes.func,
};
