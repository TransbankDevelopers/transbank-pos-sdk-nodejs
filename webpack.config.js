const path = require("path");

module.exports = {
  mode: "production",
  entry: "./index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "transbank.js",
    libraryTarget: "commonjs2"
  },
  module: {
    rules: [
    ]
  },
  optimization: {
    minimize: true
  },
  devtool: "source-map",
  externals: ['serialport'],
  plugins: [
  ],
  target: "node"
};
