const path = require("path");
var HtmlWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

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
        include: /src/,
        exclude: /node_modules/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        include: /src/,
        exclude: /node_modules/,
        use: ["url-loader"]
      }
    ]
  },
  optimization: {
    removeAvailableModules: false,
    removeEmptyChunks: false,
    runtimeChunk: 'single',
    moduleIds: 'hashed',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        }
      }
    }
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  devtool: 'source-map',
  output: {
    filename: "[name].bundle.js",
    chunkFilename: '[name].bundle.js',
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
    pathinfo: false
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html"
    }),
    new ForkTsCheckerWebpackPlugin({
      reportFiles: ['src/**/*.{ts,tsx}']
    }),
  ],
  devServer: {
    compress: true,
    historyApiFallback: true
  }
};
