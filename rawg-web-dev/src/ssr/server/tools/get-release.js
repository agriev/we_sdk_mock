import shell from 'shelljs';

const RAWG_RELEASE = shell
  .exec('git log --pretty=oneline -1')
  .stdout.trim()
  .split(' ')[0];

export default RAWG_RELEASE;
