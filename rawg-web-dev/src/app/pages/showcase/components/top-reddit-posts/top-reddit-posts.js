import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { pure } from 'recompose';

import RedditList from 'app/ui/reddit-list';

import './top-reddit-posts.styl';

const connector = connect((state) => ({
  topRedditPosts: state.showcase.topRedditPosts.results,
  size: state.app.size,
}));

const componentPropertyTypes = {
  topRedditPosts: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  size: PropTypes.oneOf(['desktop', 'phone']).isRequired,
};

const componentDefaultProperties = {};

const ShowcaseTopRedditPosts = (props) => {
  const { topRedditPosts, size } = props;

  if (!Array.isArray(topRedditPosts) || topRedditPosts.length === 0) return null;

  return (
    <div className="showcase-top-reddit-posts">
      <RedditList size={size} results={topRedditPosts} displayNum={6} messageId="showcase.top_reddit" />
    </div>
  );
};

ShowcaseTopRedditPosts.propTypes = componentPropertyTypes;
ShowcaseTopRedditPosts.defaultProps = componentDefaultProperties;

export default connector(pure(ShowcaseTopRedditPosts));
