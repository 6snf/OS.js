const path = require('path');
const osjs = require('osjs-build');

const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = new Promise((resolve, reject) => {
  const metadataFile = path.join(__dirname, 'metadata.json');

  osjs.webpack.createPackageConfiguration(metadataFile).then((result) => {
    result.config.plugins.push(new CopyWebpackPlugin([
      {from: 'animations.css'}
    ]));
    resolve(result.config);
  }).catch(reject);
});
