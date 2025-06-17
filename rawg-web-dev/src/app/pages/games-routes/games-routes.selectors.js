// getPlatforms :: Array Object -> Object
export const getPlatforms = (pltfrms) =>
  pltfrms.reduce(
    (rplatforms, { platforms, ...parentPlatform }) => ({
      parent_platforms: [...rplatforms.parent_platforms, parentPlatform],
      platforms: [...rplatforms.platforms, ...platforms],
    }),
    { parent_platforms: [], platforms: [] },
  );

// getYears :: Array Object -> Array Object
export const getYears = (yrs) =>
  yrs.reduce(
    (reducedYears, { years, ...decade }) => [
      ...reducedYears,
      {
        ...decade,
        slug: `${decade.from}-${decade.to}`,
        id: `${decade.from}-01-01,${decade.to}-12-31`,
      },
      ...years.map(({ year }) => ({
        year,
        slug: year.toString(),
        id: `${year}-01-01,${year}-12-31`,
      })),
    ],
    [],
  );

// getFilterSubcats :: Object -> Object
export const getFilterSubcats = ({ platforms, years, stores, genres }) => ({
  ...getPlatforms(platforms),
  years: getYears(years),
  stores,
  genres,
});
