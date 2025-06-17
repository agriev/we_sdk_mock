export default function decodeURIComponentSafe(uri, module_ = 0) {
  let out = '';
  let i = 0;
  let l;
  let x;

  const array = (uri || '').split(/(%(?:d0|d1)%.{2})/);

  for (l = array.length; i < l; i += 1) {
    try {
      x = decodeURIComponent(array[i]);
    } catch (e) {
      x = module_ ? array[i].replace(/%(?!\d+)/g, '%25') : array[i];
    }
    out += x;
  }
  return out;
}
