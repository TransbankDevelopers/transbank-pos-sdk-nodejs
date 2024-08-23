const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "./index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "transbank.js",
    libraryTarget: "commonjs2",
  },
  module: {
    rules: [
    ],
  },
  optimization: {
    minimize: true,
  },
  devtool: "source-map",
  externals: ['serialport'],
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "types", to: "." }, 
      ],
    }),
  ],
  target: "node",
};
