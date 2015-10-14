"use strict";

var Path = require("path");
var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
  devtool: "sourcemap",
  entry: {
    "index": "./src/index.js",
    "mention-panel": "./src/mention-panel.scss",
  },
  output: {
    path: Path.resolve(__dirname, "./lib"),
    filename: "[name].min.js",
    libraryTarget: "umd",
  },
  externals: {
    "medium-editor": "MediumEditor",
  },
  module: {
    loaders: [
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract("style", "css!sass", {
          publicPath: ""
        }),
      },
      {
        test: /\.js(x?)$/,
        exclude: /node_modules/,
        loader: "babel",
      },
    ],
  },
  plugins: [
    new webpack.EnvironmentPlugin("NODE_ENV"),
    new ExtractTextPlugin("[name].min.css"),
  ],
};
