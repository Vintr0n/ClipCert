// client/pages/Index.tsx

import { useState, useRef } from "react";
import { Button } from "../components/ui/button";
import { extractSingleFrame, getThumbnailUrl } from "../utils/video-utils";
import { compareFrames } from "../utils/compare-frames";

const FRAME_INTERVAL = 150;
const CROP_SIZE = 128;

interface FrameComparison {
  frameIndex: number;
  similarity: number;
  video1Thumbnail: string;
  video2Thumbnail: string;
}

export default function Index() {
  const [video1, setVideo1] = useState<File | null>(null);
  const [video2, setVideo2] = useState<File | null>(null);

  const [video1Preview, setVideo1Preview] = useState<string>("");
  const [video2Preview, setVideo2Preview] = useState<string>("");

  const [isComparing, setIsComparing] = useState(false);
  const [comparisonProgress, setComparisonProgress] = useState(0);

  const [comparisons, setComparisons] = useState<FrameComparison[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);

  const videoElement1 = useRef<HTMLVideoElement>(null);
  const videoElement2 = useRef<HTMLVideoElement>(null);

  const handleVideoSelect = (file: File, isFirst: boolean) => {
    const url = URL.createObjectURL(file);

    if (isFirst) {
      setVideo1(file);
      setVideo1Preview(url);
    } else {
      setVideo2(file);
      setVideo2Preview(url);
    }
  };

  const loadVideoMetadata = (file: File): Promise<HTMLVideoElement> => {
    return new Promise(resolve => {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => resolve(video);
    });
  };

  const handleCompare = async () => {
    if (!video1 || !video2) return;

    setIsComparing(true);
    setComparisonProgress(0);
    setComparisons([]);
    setSelectedFrameIndex(null);

    try {
      const vid1 = await loadVideoMetadata(video1);
      const vid2 = await loadVideoMetadata(video2);

      // video 1 frame extraction, progress 0 to 30
      const frames1 = [];
      const total1 = Math.floor((vid1.duration * 1000) / FRAME_INTERVAL);

      for (let i = 0; i < total1; i++) {
        const frame = await extractSingleFrame(vid1, i * FRAME_INTERVAL, CROP_SIZE);
        frames1.push(frame);

        const pct = Math.round((i / total1) * 30);
        setComparisonProgress(pct);

        if (i % 5 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      // video 2 frame extraction, progress 30 to 60
      const frames2 = [];
      const total2 = Math.floor((vid2.duration * 1000) / FRAME_INTERVAL);

      for (let i = 0; i < total2; i++) {
        const frame = await extractSingleFrame(vid2, i * FRAME_INTERVAL, CROP_SIZE);
        frames2.push(frame);

        const pct = 30 + Math.round((i / total2) * 30);
        setComparisonProgress(pct);

        if (i % 5 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      // comparison, progress 60 to 100
      const finalComparisons = [];
      const minFrames = Math.min(frames1.length, frames2.length);

      for (let i = 0; i < minFrames; i++) {
        const similarity = compareFrames(frames1[i], frames2[i]);

        finalComparisons.push({
          frameIndex: i,
          similarity,
          video1Thumbnail: getThumbnailUrl(frames1[i]),
          video2Thumbnail: getThumbnailUrl(frames2[i])
        });

        const pct = 60 + Math.round(((i + 1) / minFrames) * 40);
        setComparisonProgress(pct);

        if (i % 5 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      setComparisons(finalComparisons);
    } catch (err) {
      console.error(err);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="p-6">
      <div>
        <p>Video 1</p>
        <input
          type="file"
          accept="video/*"
          onChange={e => e.target.files && handleVideoSelect(e.target.files[0], true)}
        />
        {video1Preview && <video src={video1Preview} controls className="max-w-xs" />}
      </div>

      <div className="mt-4">
        <p>Video 2</p>
        <input
          type="file"
          accept="video/*"
          onChange={e => e.target.files && handleVideoSelect(e.target.files[0], false)}
        />
        {video2Preview && <video src={video2Preview} controls className="max-w-xs" />}
      </div>

      <div className="mt-6">
        <Button onClick={handleCompare} disabled={isComparing}>
          Compare
        </Button>
      </div>

      {isComparing && (
        <div className="mt-4">
          <p>Analyzing frames: {comparisonProgress}%</p>
          <div className="h-2 bg-gray-300 rounded">
            <div
              className="h-2 bg-blue-500 rounded"
              style={{ width: `${comparisonProgress}%` }}
            />
          </div>
        </div>
      )}

      {comparisons.length > 0 && (
        <div className="mt-6">
          {comparisons.map(c => (
            <div key={c.frameIndex} className="mb-4">
              <p>Frame {c.frameIndex}</p>
              <p>Similarity: {c.similarity}</p>

              <div className="flex gap-4 mt-2">
                <img src={c.video1Thumbnail} className="w-24 border" />
                <img src={c.video2Thumbnail} className="w-24 border" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
