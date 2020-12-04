<template>
  <div id="app" @dragover.prevent>
    <div class="container-xxl">
      <div class="row">
        <div
          class="col-md-3 bg-light vh-100 pl-4 p-3 text-black border border-secondary"
        >
          <div>
            <h3>File</h3>
            <b-form-file
              size="lg"
              v-model="vivusConfig.inputFile"
              :state="Boolean(vivusConfig.inputFile)"
              placeholder="Choose a file or drop it here..."
              drop-placeholder="Drop file here..."
              :disabled="!!exporting"
            ></b-form-file>
            <h3>Duration (in seconds)</h3>
            <b-form-input
              size="lg"
              type="number"
              v-model="vivusConfig.duration"
              :disabled="!!exporting"
            ></b-form-input>
            <h3>Animation Type</h3>
            <b-form-select
              size="lg"
              v-model="vivusConfig.type"
              :options="typeOptions"
              :disabled="!!exporting"
            ></b-form-select>
            <h3>Path Timing</h3>
            <b-form-select
              size="lg"
              v-model="vivusConfig.pathTimingFunction"
              :options="pathTimingOptions"
              :disabled="!!exporting"
            ></b-form-select>
            <h3>Extra time at the end (s)</h3>
            <b-form-input
              size="lg"
              type="number"
              v-model="extraTime"
              :disabled="!!exporting"
            ></b-form-input>
            <h3>Transparent background</h3>
            <b-form-checkbox
              size="lg"
              type="checkbox"
              v-model="transparency"
              :disabled="!!exporting"
            >
              Export video with a transparent background
            </b-form-checkbox>
          </div>
          <div class="text-center mt-4">
            <b-button
              variant="outline-info"
              class="mb-2"
              @click="resetPlayer"
              :disabled="!!exporting"
            >
              <b-icon icon="skip-backward-fill" aria-hidden="true"></b-icon>
            </b-button>
            <b-button
              variant="outline-info"
              class="mb-2"
              @click="togglePlayer"
              :disabled="!!exporting"
            >
              <b-icon
                icon="play-fill"
                aria-hidden="true"
                v-if="!player.playing"
              ></b-icon>
              <b-icon icon="stop-fill" aria-hidden="true" v-else></b-icon>
            </b-button>
            <b-button
              variant="outline-info"
              class="mb-2"
              @click="finishPlayer"
              :disabled="!!exporting"
            >
              <b-icon icon="skip-forward-fill" aria-hidden="true"></b-icon>
            </b-button>
          </div>

          <b-button
            variant="outline-info"
            class="mt-3 mb-2"
            @click="exportMovie"
            :disabled="!!exporting"
          >
            <span v-if="!exporting">Export as .mov</span>
            <span v-else-if="exporting === true">Exporting...</span>
            <span v-else-if="exporting === 2">Exporting video...</span>
            <span v-else-if="exporting === 3">Converting video...</span>
          </b-button>
        </div>
        <div class="col-md-9">
          <div
            id="inputImage"
            :class="{ exporting: exporting }"
            ref="inputImage"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
<style>
#inputImage {
  width: 80%;
  max-width: 80%;
  max-height: 80%;
}
#inputImage.exporting {
  width: 2560px;
  max-width: auto;
  max-height: auto;
}
h3 {
  margin-top: 20px !important;
}
</style>

<script>
import Vivus from "vivus";
import tempy from "tempy";
import fs from "fs-extra";
import path from "path";
import { remote } from "electron";

import svgToPng from "./services/png.conversion.service.js";
import videoService from "./services/video.service.js";

const wait = async function(delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  });
};

export default {
  name: "App",
  data() {
    return {
      exporting: false,
      vivusInstance: null,
      extraTime: 0.1,
      vivusConfig: {
        inputFile: null,
        duration: process.env.NODE_ENV === "development" ? 0.1 : 3,
        pathTimingFunction: Vivus.LINEAR,
        type: "oneByOne"
      },
      player: {
        progress: 0,
        playing: false
      },
      typeOptions: ["delayed", "sync", "oneByOne"],
      pathTimingOptions: [
        { value: Vivus.LINEAR, text: "Linear" },
        { value: Vivus.EASE, text: "Ease" }
      ],
      transparency: process.platform === "darwin"
    };
  },
  computed: {},
  watch: {
    vivusConfig: {
      handler: function() {
        if (
          this.vivusConfig.inputFile &&
          this.vivusConfig.inputFile.path.length
        ) {
          if (this.vivusInstance) {
            this.vivusInstance.destroy();
          }
          this.$refs.inputImage.innerHTML = "";
          this.$set(
            this,
            "vivusInstance",
            new Vivus("inputImage", {
              duration: this.vivusConfig.duration * 60,
              pathTimingFunction: this.vivusConfig.pathTimingFunction,
              type: this.vivusConfig.type,
              file: "local-resource://" + this.vivusConfig.inputFile.path,
              start: "manual",
              onReady: () => {
                this.togglePlayer(null, true);
              }
            })
          );
        }
      },
      deep: true
    }
  },
  methods: {
    resetPlayer() {
      if (this.vivusInstance) {
        this.vivusInstance.reset();
        this.player.playing = false;
      }
    },
    finishPlayer() {
      if (this.vivusInstance) {
        this.vivusInstance.finish();
        this.player.playing = false;
      }
    },
    togglePlayer(event, play) {
      if (this.vivusInstance) {
        if (this.vivusInstance.getStatus() === "end") {
          this.vivusInstance.reset();
        }
        if (play || !this.player.playing) {
          this.player.playing = true;
          this.vivusInstance.play(1, () => {
            this.player.playing = false;
          });
        } else {
          this.vivusInstance.stop();
          this.player.playing = false;
        }
      }
    },
    async exportMovie() {
      if (this.vivusInstance) {
        let { canceled, filePath } = await remote.dialog.showSaveDialog({
          title: "Save video as"
        });
        if (canceled) {
          return;
        }
        try {
          this.vivusInstance.reset();
          const numberOfFrames = this.vivusConfig.duration * 60;
          this.exporting = true;
          const tempDirectory = tempy.directory();
          for (let frame = 0; frame <= numberOfFrames; frame++) {
            await wait(100);
            this.vivusInstance.setFrameProgress(frame / numberOfFrames);
            await wait(100);
            let base64Image = await svgToPng(
              this.$refs.inputImage.innerHTML,
              2560,
              1440
              // this.$refs.inputImage.clientWidth,
              // this.$refs.inputImage.clientHeight
            );
            await fs.writeFile(
              path.join(tempDirectory, frame + ".png"),
              base64Image.replace("data:image/png;base64,", ""),
              "base64"
            );
          }
          this.exporting = 2;
          await videoService.convertImagesToVideo(
            tempDirectory,
            this.extraTime,
            filePath,
            this.transparency
          );
          try {
            alert("Video created successfully !");
            this.exporting = false;
            await fs.remove(tempDirectory);
          } catch (err) {
            alert("an error occurred: " + err.message);
            console.error(err);
            this.exporting = false;
            await fs.remove(tempDirectory);
          }
        } catch (e) {
          alert("An error occured during the export function.");
          console.error(e);
          this.exporting = false;
        }
      } else {
        alert("You must first select an SVG file.");
        console.log(svgToPng);
        console.log(wait);
        this.exporting = false;
      }
    }
  }
};
</script>
