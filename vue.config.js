const webpack = require("webpack");

module.exports = {
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        "process.env.FLUENTFFMPEG_COV": false,
      }),
    ],
  },
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      builderOptions: {
        asarUnpack: [
          "**/app/node_modules/ffmpeg-static/*",
          "node_modules/ffmpeg-static/*",
          "../node_modules/@ffmpeg-installer",
          "../node_modules/ffmpeg-static/*",
          "../node_modules/ffmpeg-static",
        ],
      },
    },
  },
};
