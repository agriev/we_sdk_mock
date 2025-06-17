import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import memoize from 'fast-memoize';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';
import LoadMore from 'app/ui/load-more';

import denormalizeGame from 'tools/redux/denormalize-game';
import { loadGameScreenshots } from 'app/pages/game/game.actions';

import {
  uploadNewScreenshots,
  removeScreenshot,
  replaceScreenshot,
  restoreScreenshot,
} from 'app/pages/game-edit/actions/screenshots';

import { screenshots as screenshotsTypes, slug as slugType } from 'app/pages/game/game.types';
import { uploadingImagesType } from 'app/pages/game-edit/game-edit.types';

import resize from 'tools/img/resize';

import AddBtn from 'app/pages/game-edit/components/add-btn';

import addIcon from 'assets/icons/add.svg';
import replaceIcon from 'assets/icons/replace-rounded.svg';
import closeIcon from 'assets/icons/close-rounded.svg';
import restoreRoundedIcon from 'assets/icons/restore-rounded.svg';
import trans from 'tools/trans';

import './screenshots.styl';
import { appSizeType } from 'app/pages/app/app.types';

const SCREENSHOTS_PER_PAGE = 40;

@hot(module)
@injectIntl
@connect((state) => ({
  screenshots: denormalizeGame(state).screenshots,
  gameSlug: denormalizeGame(state).slug,
  uploadingImages: state.gameEdit.uploadingImages,
  appSize: state.app.size,
}))
class Screenshots extends React.Component {
  static propTypes = {
    appSize: appSizeType.isRequired,
    screenshots: screenshotsTypes.isRequired,
    gameSlug: slugType.isRequired,
    uploadingImages: uploadingImagesType.isRequired,
    dispatch: PropTypes.func.isRequired,
    gameId: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);

    this.onDeleteClick = memoize(this.onDeleteClick);
    this.onRestoreClick = memoize(this.onRestoreClick);
    this.onReplaceClick = memoize(this.onReplaceClick);
    this.getScreenshotStyle = memoize(this.getScreenshotStyle);
  }

  componentDidMount() {
    const { gameId } = this.props;

    if (gameId) {
      this.props.dispatch(
        loadGameScreenshots({
          id: gameId,
          page: 1,
          pageSize: SCREENSHOTS_PER_PAGE,
          withDeleted: true,
        }),
      );
    }
  }

  onSelectFile = (event) => {
    this.props.dispatch(uploadNewScreenshots(event.target.files));
  };

  onDeleteClick = (id) => () => {
    this.props.dispatch(removeScreenshot(id));
  };

  onRestoreClick = (id) => () => {
    this.props.dispatch(restoreScreenshot(id));
  };

  onReplaceClick = (id) => (event) => {
    const img = event.target.files[0];
    this.props.dispatch(replaceScreenshot(id, img));
  };

  getScreenshotStyle = (img) => ({
    backgroundImage: `url("${resize(640, img)}")`,
  });

  load = () => {
    const { dispatch, screenshots, gameSlug } = this.props;

    return dispatch(
      loadGameScreenshots({
        id: gameSlug,
        page: screenshots.next,
        pageSize: SCREENSHOTS_PER_PAGE,
        withDeleted: true,
      }),
    );
  };

  render() {
    const { screenshots, uploadingImages, appSize } = this.props;
    const { active, allCount, uploadedCount } = uploadingImages;
    const { results, loading, next, count } = screenshots;

    return (
      <div>
        <div
          className={cn('game-edit__screenshot__wrapper', {
            'game-edit__screenshot__wrapper_uploading': active,
          })}
        >
          {!active && (
            <input
              className="game-edit__screenshot__input"
              type="file"
              autoComplete="off"
              onChange={this.onSelectFile}
              multiple
            />
          )}
          <AddBtn
            className="game-edit__screenshot__input__add-btn"
            icon={active ? replaceIcon : addIcon}
            readOnly={active}
            text={
              active
                ? trans('game_edit.field_screenshots_uploading', {
                    allCount,
                    uploadedCount,
                  })
                : trans('game_edit.field_screenshots_add')
            }
          />
        </div>
        <LoadMore appSize={appSize} load={this.load} count={count} next={next} loading={loading} isOnScroll>
          <div className="game-edit__screenshots">
            {results.map((img) => (
              <div
                key={img.id}
                className={cn('game-edit__screenshot', {
                  'game-edit__screenshot_deleted': img.is_deleted,
                  'game-edit__screenshot_new': img.is_new,
                })}
                style={this.getScreenshotStyle(img.image)}
              >
                <div className="game-edit__screenshot__btns">
                  {!img.is_deleted && (
                    <div className="game-edit__screenshot__replace-wrapper">
                      <input
                        className="game-edit__screenshot__replace__input"
                        type="file"
                        autoComplete="off"
                        onChange={this.onReplaceClick(img.id)}
                        multiple
                      />
                      <div className="game-edit__screenshot__replace">
                        <SVGInline svg={replaceIcon} />
                        Replace
                      </div>
                    </div>
                  )}
                  {!img.is_deleted && (
                    <div
                      className="game-edit__screenshot__delete"
                      onClick={this.onDeleteClick(img.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <SVGInline svg={closeIcon} />
                      Delete
                    </div>
                  )}
                  {img.is_deleted && (
                    <div
                      className="game-edit__screenshot__restore"
                      onClick={this.onRestoreClick(img.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <SVGInline svg={restoreRoundedIcon} />
                      Restore
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </LoadMore>
      </div>
    );
  }
}

export default Screenshots;
