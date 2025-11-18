/**
 * Extract frames from a video file
 */
export async function extractFrames(
  videoFile: File,
  frameInterval: number = 100
): Promise<ImageData[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const frames: ImageData[] = [];
      let currentTime = 0;

      const extractFrame = () => {
        if (currentTime >= video.duration) {
          video.pause();
          resolve(frames);
          return;
        }

        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        frames.push(imageData);
        currentTime += frameInterval / 1000;
        extractFrame();
      };

      extractFrame();
    };

    video.onerror = () => {
      reject(new Error("Failed to load video"));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Simple hash function for frame data (perceptual hash)
 */
export function hashFrame(imageData: ImageData): string {
  const data = imageData.data;
  let hash = 0;
  let brightness = 0;

  // Sample every 10th pixel for performance
  for (let i = 0; i < data.length; i += 40) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    brightness += (r + g + b) / 3;
    hash ^= ((r << 16) | (g << 8) | b) * 2654435761;
  }

  return (hash >>> 0).toString(16) + (brightness >>> 0).toString(16);
}

/**
 * Calculate similarity between two frames (0-1, where 1 is identical)
 */
export function compareFrames(frame1: ImageData, frame2: ImageData): number {
  const data1 = frame1.data;
  const data2 = frame2.data;

  if (data1.length !== data2.length) {
    return 0;
  }

  let matchingPixels = 0;
  const threshold = 30; // Color difference threshold

  // Sample every 4th pixel for performance
  for (let i = 0; i < data1.length; i += 4) {
    const diff =
      Math.abs(data1[i] - data2[i]) +
      Math.abs(data1[i + 1] - data2[i + 1]) +
      Math.abs(data1[i + 2] - data2[i + 2]);

    if (diff < threshold) {
      matchingPixels++;
    }
  }

  return matchingPixels / (data1.length / 4);
}

/**
 * Generate frame thumbnails for preview
 */
export function generateFrameThumbnail(
  imageData: ImageData,
  maxWidth: number = 100,
  maxHeight: number = 60
): string {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  if (!tempCtx) {
    throw new Error("Failed to get canvas context");
  }

  // First, put the full resolution image on a temporary canvas
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCtx.putImageData(imageData, 0, 0);

  // Now create a thumbnail by drawing the full image onto a smaller canvas
  const thumbCanvas = document.createElement("canvas");
  const thumbCtx = thumbCanvas.getContext("2d");

  if (!thumbCtx) {
    throw new Error("Failed to get canvas context");
  }

  const aspectRatio = imageData.width / imageData.height;
  let width = maxWidth;
  let height = maxHeight;

  if (width / height > aspectRatio) {
    width = height * aspectRatio;
  } else {
    height = width / aspectRatio;
  }

  thumbCanvas.width = Math.round(width);
  thumbCanvas.height = Math.round(height);

  // Draw the resized image
  thumbCtx.drawImage(tempCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  return thumbCanvas.toDataURL("image/jpeg", 0.7);
}
