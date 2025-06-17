/// <reference types="Cypress" />

import addEmailSymbol from '../add-email-symbol.js';

const reviewsRating = 'getReviewsRating';
const reviewsReactions = 'getReviewsReactions';
const genres = 'getGenres';
const platforms = 'getPlatforms';

export const generalRoutes = () => {
  cy.route('api/reviews/ratings', 'fixture:reviews.rating.json').as(reviewsRating);
  cy.route('api/reviews/reactions', 'fixture:reviews.reactions.json').as(reviewsReactions);
  cy.route('api/genres', 'fixture:genres.json').as(genres);
  cy.route('api/platforms', 'fixture:platforms.json').as(platforms);
};

export const generalRoutesNames = [reviewsRating, reviewsReactions, genres, platforms].map(addEmailSymbol);
