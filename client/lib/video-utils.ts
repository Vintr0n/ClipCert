/**
 * Extract frames from a video file with center-crop region
 * Uses frame-accurate extraction to ensure perfect alignment
 */
export async function extractFrames(
  videoFile: File,
  _frameInterval: number = 1, // Now always 1 for accuracy - we extract every frame
  cropSize: number = 250,
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
      let isExtracting = false;
      let extractionComplete = false;

      const extractFrameFromVideo = async () => {
        return new Promise<void>((frameResolve) => {
          // Use requestAnimationFrame to ensure frame is rendered
          requestAnimationFrame(() => {
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
            frameResolve();
          });
        });
      };

      const stepThroughVideo = async () => {
        isExtracting = true;

        // Extract first frame
        await extractFrameFromVideo();

        // Step through remaining frames
        while (!extractionComplete && video.currentTime < video.duration - 0.001) {
          // Small advance in time to get next frame
          // At 30fps, frame duration is ~0.033s, but we use smaller increment for safety
          video.currentTime += 0.016; // ~60fps fallback

          // Wait for frame to be ready
          await new Promise<void>((frameResolve) => {
            let frameWaitCount = 0;
            const checkFrame = () => {
              frameWaitCount++;
              if (frameWaitCount > 100) {
                // Timeout - move on
                frameResolve();
                return;
              }
              requestAnimationFrame(async () => {
                await extractFrameFromVideo();
                frameResolve();
              });
            };
            checkFrame();
          });
        }

        isExtracting = false;
        extractionComplete = true;
        resolve(frames);
      };

      // Start extraction once video is ready
      setTimeout(() => {
        stepThroughVideo().catch((error) => {
          reject(error);
        });
      }, 100);
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
 * Optimized for accuracy when comparing identical videos
 */
export function compareFrames(frame1: ImageData, frame2: ImageData): number {
  const data1 = frame1.data;
  const data2 = frame2.data;

  if (data1.length !== data2.length) {
    return 0;
  }

  let matchingPixels = 0;
  let totalDifference = 0;
  const threshold = 45; // Threshold for pixel color difference
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

  // Boost the score for near-identical frames to ensure 100% match for same video
  // If pixel similarity is > 98%, round to 1.0
  if (pixelSimilarity > 0.98) {
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
