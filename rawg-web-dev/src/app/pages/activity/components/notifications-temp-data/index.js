import replyOnCommentOnCollection from './reply-on-comment-on-collection';
import replyOnCommentOnPost from './reply-on-comment-on-post';
import replyOnCommentOnReview from './reply-on-comment-on-review';
import commentOnPost from './comment-on-post';
import commentOnReview from './comment-on-review';
import commentOnCollection from './comment-on-collection';
import followedYou from './followed-you';
import followedOthers from './followed-others';
import followedCollection from './followed-collection';
import followedCollections from './followed-collections';
import suggestedGameToCollection from './suggested-game-to-collection';
import suggestedGamesToCollection from './suggested-games-to-collection';
import gameIsReleased from './game-is-released';
import favoriteCommentOnReview from './favorite-comment-on-review';
import favoriteCommentOnCollection from './favorite-comment-on-collection';
import favoriteCommentOnPost from './favorite-comment-on-post';
import upvotedCollection from './upvoted-collection';

export default {
  count: 30,
  next: null,
  loading: false,
  previous: null,
  results: [
    gameIsReleased,
    followedYou,
    followedOthers,
    followedCollection,
    followedCollections,
    suggestedGameToCollection,
    suggestedGamesToCollection,
    replyOnCommentOnCollection,
    replyOnCommentOnPost,
    replyOnCommentOnReview,
    commentOnPost,
    commentOnReview,
    commentOnCollection,
    favoriteCommentOnReview,
    favoriteCommentOnCollection,
    favoriteCommentOnPost,
    upvotedCollection,
  ],
};
