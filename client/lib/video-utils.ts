// client/utils/video-utils.ts

export const extractSingleFrame = (
  video: HTMLVideoElement,
  timeMs: number,
  cropSize: number
): Promise<ImageData> => {
  return new Promise(resolve => {
    video.currentTime = timeMs / 1000;

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = cropSize;
      canvas.height = cropSize;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(video, 0, 0, cropSize, cropSize);
      const imageData = ctx.getImageData(0, 0, cropSize, cropSize);
      resolve(imageData);
    };
  });
};

// Optional helper if you want thumbnails
export const getThumbnailUrl = (imageData: ImageData): string => {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
};
