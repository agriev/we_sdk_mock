/* eslint-disable react/no-danger */

import React from 'react';
import PropTypes from 'prop-types';

import './text.styl';

import UserContent from 'app/ui/user-content';
import EmbedPreviews from 'app/ui/embed-previews';
import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';
import TruncateBlockByLines from 'app/ui/truncate-block-by-lines';
import TruncateBlockByHeight from 'app/ui/truncate-block-by-height';
import trans from 'tools/trans';
import len from 'tools/array/len';

import get from 'lodash/get';
import pick from 'lodash/pick';

import { isNeedWrapper } from 'app/ui/truncate-block-by-height/truncate-block-by-height.helpers';

const propTypes = {
  review: PropTypes.shape().isRequired,
  truncateText: PropTypes.bool.isRequired,
  truncateStyle: PropTypes.oneOf(['lines', 'height']),
  expanded: PropTypes.bool.isRequired,
  fullReviewLink: PropTypes.bool.isRequired,
  size: PropTypes.string.isRequired,
  goToReview: PropTypes.func.isRequired,
  expand: PropTypes.func.isRequired,
  showEmbeds: PropTypes.bool.isRequired,
  textLines: PropTypes.number,
  textHeight: PropTypes.number,
  acceptableTextLength: PropTypes.number,
  visible: PropTypes.bool,
  showReviewMeta: PropTypes.bool,
  isSpider: PropTypes.bool.isRequired,
};

const defaultProps = {
  truncateStyle: 'lines',
  textLines: undefined,
  textHeight: undefined,
  acceptableTextLength: undefined,
  visible: true,
  showReviewMeta: false,
};

const calcLines = ({ textLines: textLinesArgument, review, size }) => {
  let textLines = textLinesArgument || (appHelper.isDesktopSize(size) ? 6 : 7);

  if (review.text_preview) {
    textLines -= 2;
  }

  return Math.max(1, textLines);
};

const ReviewCardText = ({
  review,
  truncateText,
  truncateStyle,
  expanded,
  textLines,
  textHeight,
  acceptableTextLength,
  size,
  fullReviewLink,
  goToReview,
  expand,
  showEmbeds,
  visible,
  showReviewMeta,
  isSpider,
}) => {
  if (!review.text) {
    return null;
  }

  const text = get(review, 'text', '');
  const textLength = len(unescape(text.replace(/<\/?[^>]+(>|$)/g, ' ')));
  const lengthAcceptable = acceptableTextLength && textLength < acceptableTextLength;
  const needWrapper = (truncateStyle === 'height' && isNeedWrapper(textLength)) || truncateStyle === 'lines';

  if (isSpider || truncateText === false || expanded || lengthAcceptable || !needWrapper) {
    return (
      <UserContent itemProp={showReviewMeta ? 'reviewBody' : ''} className="review-card__text" content={review.text} />
    );
  }

  return (
    <div className="review-card__text-wrapper">
      {truncateStyle === 'lines' && (
        <TruncateBlockByLines
          className="review-card__text"
          lines={calcLines({ textLines: textLines - 1, review, size })}
          expanded={expanded}
          text={review.text}
          showMoreText={fullReviewLink ? trans('shared.review_full_review') : undefined}
          onShowMoreClick={fullReviewLink ? goToReview : expand}
        />
      )}
      {truncateStyle === 'height' && (
        <TruncateBlockByHeight
          onReadMoreClick={fullReviewLink ? goToReview : expand}
          className="review-card__text"
          phone
          desktop
          maxHeight={textHeight}
          length={textLength}
        >
          <div
            dangerouslySetInnerHTML={{
              __html: review.text,
            }}
          />
        </TruncateBlockByHeight>
      )}
      {showEmbeds && (
        <EmbedPreviews
          appSize={size}
          path={paths.review(review.id)}
          embedData={pick(review, ['text_attachments', 'text_previews'])}
          visible={visible}
        />
      )}
    </div>
  );
};

ReviewCardText.propTypes = propTypes;
ReviewCardText.defaultProps = defaultProps;

export default ReviewCardText;
