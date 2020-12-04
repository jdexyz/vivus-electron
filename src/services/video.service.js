import ffmpegStatic from "ffmpeg-static";
import execa from "execa";
import path from "path";
import { remote } from "electron";

console.log(ffmpegStatic);
let FFMPEGPath;
// I can't get electron builder to unpack ffmpeg-static using asarUnpack...
if (process.env.NODE_ENV === "development") {
  console.log(remote.process.env);
  FFMPEGPath = path.join(
    remote.process.env.INIT_CWD,
    "node_modules",
    "ffmpeg-static",
    "ffmpeg"
  );
} else {
  console.log(ffmpegStatic.replace("app.asar", "node_modules/ffmpeg-static"));
  FFMPEGPath = ffmpegStatic.replace("app.asar", "node_modules/ffmpeg-static");
}

const convertImagesToVideo = async (
  tempDirectory,
  extraTime,
  filePath,
  transparency
) => {
  await execa(
    FFMPEGPath,
    [
      "-i",
      path.join(tempDirectory, "%1d.png"),
      "-y",
      "-an",
      "-r",
      "60",
      "-c:v",
      "prores_ks",
      "-profile:v",
      "4",
      "-quant_mat",
      "'hq'",
      "-pix_fmt",
      "yuva444p10le",
      extraTime ? "-vf" : "",
      extraTime ? `tpad=stop_mode=clone:stop_duration=${extraTime}` : "",
      filePath.replace(/\.mov$/i, "") + ".mov",
    ],
    { shell: true }
  );
  if (process.platform === "darwin" && transparency) {
    await execa("avconvert", [
      "--source",
      filePath,
      "--output",
      filePath.replace(/\.mov$/i, "_transparent.mov"),
      "--preset",
      "PresetHEVCHighestQualityWithAlpha",
    ]);
  }
  return;
};

export default {
  convertImagesToVideo,
};

// Using fluent ffmpeg (buggy)
// import ffmpeg from "fluent-ffmpeg";

// ffmpeg.setFfmpegPath(FFMPEGPath);
// return new Promise((resolve, reject) => {
//   ffmpeg()
//     .noAudio()
//     .input(path.join(tempDirectory, "%1d.png"))
//     .fps(60)
//     .videoCodec("prores_ks")
//     .outputOptions([
//       "-profile:v 4",
//       "-quant_mat 'hq'",
//       "-pix_fmt yuva444p10le",
//     ])
//     .videoFilter(`tpad=stop_mode=clone:stop_duration=${extraTime}`)
//     .on("end", () => {
//       resolve();
//     })
//     .on("error", (err) => {
//       reject(err);
//     })
//     .save(filePath.replace(/\.mov$/i, "") + ".mov");
// });
