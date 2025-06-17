const request = require.context('./', true, /\.jpg$/);
const imageNames = request.keys().map((key) => key.split('/')[1]);

export default imageNames;
