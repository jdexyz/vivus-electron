export default async function svgToPng(svg, width, height) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const svgImage = document.createElement("img");
    document.body.appendChild(svgImage);
    svgImage.onload = function() {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const canvasCtx = canvas.getContext("2d");
      canvasCtx.drawImage(svgImage, 0, 0);
      const imgData = canvas.toDataURL("image/png");
      resolve(imgData);
      URL.revokeObjectURL(url);
    };
    svgImage.src = url;
  });
}
