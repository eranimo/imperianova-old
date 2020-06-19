const path = require("path");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var webpack = require("webpack");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const ThreadsPlugin = require('threads-plugin');

module.exports = {
  entry: {
    main: "./src/index.tsx",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        include: /src/,
        options: {
          transpileOnly: true,
          experimentalWatchApi: true,
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        loader: "file-loader",
        options: {
          name: '[path][name].[ext]',
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: ["file-loader"],
      },
      {
        test: /\.json$/,
        loader: 'file-loader',
        type: 'javascript/auto'
      }
    ],
  },
  optimization: {
    removeAvailableModules: false,
    removeEmptyChunks: false,
    runtimeChunk: "single",
    moduleIds: "hashed",
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
        },
      },
    },
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  devtool: "source-map",
  output: {
    filename: "[name].bundle.js",
    chunkFilename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
    pathinfo: false,
    globalObject: 'self'
  },
  plugins: [
    new webpack.ProvidePlugin({
      PIXI: 'pixi.js'
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
    new ForkTsCheckerWebpackPlugin({
      reportFiles: ["src/**/*.{ts,tsx}"],
    }),
    new ThreadsPlugin(),
  ],
  devServer: {
    compress: true,
    historyApiFallback: true,
  },
};
