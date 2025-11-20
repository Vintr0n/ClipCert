/**
 * Extract frames from a video file with center-crop region
 * Uses precise time-stepping to extract all frames consistently
 * Supports progress callback for UI updates
 */
export async function extractFrames(
  videoFile: File,
  _frameInterval: number = 1, // Ignore this - always extract all frames for accuracy
  cropSize: number = 250,
  onProgress?: (progress: number) => void, // Progress callback: 0-100
): Promise<ImageData[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    video.crossOrigin = "anonymous";

    video.onloadedmetadata = () => {
      canvas.width = cropSize;
      canvas.height = cropSize;

      const frames: ImageData[] = [];

      // Detect actual video framerate (default to 30fps if unavailable)
      // Most videos are 24fps, 29.97fps, or 30fps
      let fps = 30;
      if (video.mozFrameDelay) {
        fps = 1000 / video.mozFrameDelay;
      }

      const frameTime = 1 / fps; // Duration of each frame in seconds
      const duration = video.duration;
      const totalFrames = Math.floor(duration / frameTime);

      let currentFrameIndex = 0;
      let pendingSeek = false;

      const extractCurrentFrame = () => {
        if (pendingSeek) return;

        const h = video.videoHeight;
        const w = video.videoWidth;
        const cropLeft = Math.floor(Math.max(0, (w - cropSize) / 2));
        const cropTop = Math.floor(Math.max(0, (h - cropSize) / 2));
        const drawWidth = Math.min(cropSize, w - cropLeft);
        const drawHeight = Math.min(cropSize, h - cropTop);

        // Clear canvas
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, cropSize, cropSize);

        // Draw center-cropped region
        ctx.drawImage(
          video,
          cropLeft,
          cropTop,
          drawWidth,
          drawHeight,
          0,
          0,
          drawWidth,
          drawHeight,
        );

        // Fill padding if needed
        if (drawWidth < cropSize || drawHeight < cropSize) {
          ctx.fillStyle = "black";
          if (drawWidth < cropSize) {
            ctx.fillRect(drawWidth, 0, cropSize - drawWidth, cropSize);
          }
          if (drawHeight < cropSize) {
            ctx.fillRect(0, drawHeight, cropSize, cropSize - drawHeight);
          }
        }

        const imageData = ctx.getImageData(0, 0, cropSize, cropSize);
        frames.push(imageData);

        currentFrameIndex++;

        // Report progress to callback
        if (onProgress && totalFrames > 0) {
          const progressPercent = Math.floor(
            (currentFrameIndex / totalFrames) * 100,
          );
          onProgress(progressPercent);
        }

        if (currentFrameIndex >= totalFrames) {
          video.pause();
          resolve(frames);
          return;
        }

        // Seek to next frame
        pendingSeek = true;
        const nextTime = currentFrameIndex * frameTime;
        // Clamp to duration
        video.currentTime = Math.min(nextTime, duration - 0.001);
      };

      video.onseeked = () => {
        pendingSeek = false;
        // Small delay to ensure frame is rendered
        requestAnimationFrame(() => {
          extractCurrentFrame();
        });
      };

      // Start extraction
      video.currentTime = 0;
    };

    video.onerror = (e) => {
      console.error("Video load error:", e);
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
 * Optimized for accuracy with proper thresholds
 */
export function compareFrames(frame1: ImageData, frame2: ImageData): number {
  const data1 = frame1.data;
  const data2 = frame2.data;

  if (data1.length !== data2.length) {
    return 0;
  }

  let matchingPixels = 0;
  let totalDifference = 0;
  const threshold = 35; // Threshold for pixel color difference (adjusted for accuracy)
  const pixelsToCheck = Math.floor(data1.length / 4);

  // Check every pixel for maximum accuracy
  for (let i = 0; i < data1.length; i += 4) {
    const rDiff = Math.abs(data1[i] - data2[i]);
    const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
    const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
    const diff = rDiff + gDiff + bDiff;
    totalDifference += diff;

    if (diff < threshold) {
      matchingPixels++;
    }
  }

  // Calculate final similarity score
  const pixelSimilarity = matchingPixels / pixelsToCheck;

  // For near-identical frames (codec compression variations), round up
  // This ensures same video = 100%, different videos show actual difference
  if (pixelSimilarity >= 0.99) {
    return 1.0;
  }

  return pixelSimilarity;
}

/**
 * Generate frame thumbnails for preview
 */
export function generateFrameThumbnail(
  imageData: ImageData,
  maxWidth: number = 100,
  maxHeight: number = 60,
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
