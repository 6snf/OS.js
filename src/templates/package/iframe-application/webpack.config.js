const path = require('path');
const osjs = require('osjs-build');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = new Promise((resolve, reject) => {
  const metadataFile = path.join(__dirname, 'metadata.json');

  osjs.webpack.createPackageConfiguration(metadataFile).then((result) => {
    const configuration = result.config;

    const copy = [{
      from: path.join(__dirname, 'data'),
      to: 'data'
    }];

    configuration.plugins.push(new CopyWebpackPlugin(copy, {
    }));

    resolve(configuration);
  }).catch(reject);
});
