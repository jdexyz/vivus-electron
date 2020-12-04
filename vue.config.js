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

      //   asarUnpack: [
      //     "node_modules/ffmpeg-static/bin/${os}/${arch}/ffmpeg",
      //     "node_modules/ffmpeg-static/index.js",
      //     "node_modules/ffmpeg-static/package.json",
      //   ],
    },
  },
};
