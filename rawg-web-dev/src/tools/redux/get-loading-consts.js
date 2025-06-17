const getLoadingConsts = (string) => ({
  started: `${string}_STARTED`,
  success: `${string}_SUCCESS`,
  failed: `${string}_FAILED`,
  array: [`${string}_STARTED`, `${string}_SUCCESS`, `${string}_FAILED`],
});

export default getLoadingConsts;
