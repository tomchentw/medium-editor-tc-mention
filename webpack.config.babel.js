import {
  resolve as resolvePath,
} from "path";

import {
  default as webpack,
} from "webpack";

import {
  default as ExtractTextPlugin,
} from "extract-text-webpack-plugin";

export default {
  devtool: `sourcemap`,
  entry: {
    index: `./src/index.js`,
    "mention-panel": `./src/mention-panel.scss`,
  },
  output: {
    path: resolvePath(__dirname, `./lib`),
    filename: `[name].min.js`,
    libraryTarget: `umd`,
  },
  externals: {
    "medium-editor": `MediumEditor`,
  },
  module: {
    loaders: [
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract(`style`, `css!sass`, {
          publicPath: ``
        }),
      },
      {
        test: /\.js(x?)$/,
        exclude: /node_modules/,
        loader: `babel`,
      },
    ],
  },
  plugins: [
    new webpack.EnvironmentPlugin(`NODE_ENV`),
    new ExtractTextPlugin(`[name].min.css`),
  ],
};
