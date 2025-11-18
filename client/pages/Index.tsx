import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { extractFrames, compareFrames } from "@/lib/video-utils";
import { Play, Upload, X } from "lucide-react";

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
  const [comparisons, setComparisons] = useState<FrameComparison[]>([]);
  const [comparisonProgress, setComparisonProgress] = useState(0);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  const handleVideoSelect = (
    file: File,
    isVideo1: boolean
  ) => {
    const url = URL.createObjectURL(file);
    if (isVideo1) {
      setVideo1(file);
      setVideo1Preview(url);
    } else {
      setVideo2(file);
      setVideo2Preview(url);
    }
  };

  const handleCompare = async () => {
    if (!video1 || !video2) {
      return;
    }

    setIsComparing(true);
    setComparisonProgress(0);
    setComparisons([]);

    try {
      const frames1 = await extractFrames(video1);
      setComparisonProgress(50);

      const frames2 = await extractFrames(video2);
      setComparisonProgress(75);

      const frameComparisons: FrameComparison[] = [];
      const minFrames = Math.min(frames1.length, frames2.length);

      for (let i = 0; i < minFrames; i++) {
        const similarity = compareFrames(frames1[i], frames2[i]);
        frameComparisons.push({
          frameIndex: i,
          similarity,
          video1Thumbnail: getThumbnailUrl(frames1[i]),
          video2Thumbnail: getThumbnailUrl(frames2[i]),
        });
      }

      setComparisons(frameComparisons);
      setComparisonProgress(100);
    } catch (error) {
      console.error("Error comparing videos:", error);
    } finally {
      setIsComparing(false);
    }
  };

  const getThumbnailUrl = (canvas: any): string => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 100;
    tempCanvas.height = 60;
    const ctx = tempCanvas.getContext("2d");
    if (ctx && canvas) {
      ctx.putImageData(canvas, 0, 0);
    }
    return tempCanvas.toDataURL("image/jpeg", 0.6);
  };

  const stats = {
    totalFrames: comparisons.length,
    matchedFrames: comparisons.filter((c) => c.similarity > 0.8).length,
    averageSimilarity:
      comparisons.length > 0
        ? (
            (comparisons.reduce((sum, c) => sum + c.similarity, 0) /
              comparisons.length) *
            100
          ).toFixed(1)
        : 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">
            Video Frame Compare
          </h1>
          <p className="mt-4 text-xl text-slate-600">
            Upload two videos and instantly see which frames match
          </p>
        </div>

        <div className="mb-12 grid gap-6 lg:grid-cols-2">
          <VideoUploadPanel
            title="Video 1"
            selected={video1 !== null}
            preview={video1Preview}
            isPlaying={false}
            onFileSelect={(file) => handleVideoSelect(file, true)}
            onRemove={() => {
              setVideo1(null);
              setVideo1Preview("");
              setComparisons([]);
            }}
            videoRef={video1Ref}
          />

          <VideoUploadPanel
            title="Video 2"
            selected={video2 !== null}
            preview={video2Preview}
            isPlaying={false}
            onFileSelect={(file) => handleVideoSelect(file, false)}
            onRemove={() => {
              setVideo2(null);
              setVideo2Preview("");
              setComparisons([]);
            }}
            videoRef={video2Ref}
          />
        </div>

        <div className="mb-12 flex justify-center">
          <Button
            onClick={handleCompare}
            disabled={!video1 || !video2 || isComparing}
            size="lg"
            className="gap-2 bg-blue-600 px-8 py-6 text-lg hover:bg-blue-700"
          >
            {isComparing ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Comparing... {Math.round(comparisonProgress)}%
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Compare Videos
              </>
            )}
          </Button>
        </div>

        {comparisons.length > 0 && (
          <div className="space-y-8">
            <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.totalFrames}
                </div>
                <div className="text-sm text-slate-600">Total Frames</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.matchedFrames}
                </div>
                <div className="text-sm text-slate-600">Matched Frames</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.averageSimilarity}%
                </div>
                <div className="text-sm text-slate-600">Avg Similarity</div>
              </div>
            </div>

            <div>
              <h2 className="mb-6 text-2xl font-bold text-slate-900">
                Frame-by-Frame Timeline
              </h2>
              <div className="space-y-3">
                {comparisons.map((comparison) => (
                  <FrameComparison
                    key={comparison.frameIndex}
                    frameIndex={comparison.frameIndex}
                    similarity={comparison.similarity}
                    video1Thumbnail={comparison.video1Thumbnail}
                    video2Thumbnail={comparison.video2Thumbnail}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface VideoUploadPanelProps {
  title: string;
  selected: boolean;
  preview: string;
  isPlaying: boolean;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

function VideoUploadPanel({
  title,
  selected,
  preview,
  onFileSelect,
  onRemove,
  videoRef,
}: VideoUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 transition hover:border-slate-400 hover:bg-slate-50">
      {selected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button
              onClick={onRemove}
              className="inline-flex items-center justify-center rounded-lg bg-slate-100 p-2 hover:bg-slate-200"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900">
            <video
              ref={videoRef}
              src={preview}
              controls
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer space-y-4 text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-slate-500">MP4, WebM, or other video</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onFileSelect(file);
          }
        }}
        className="hidden"
      />
    </div>
  );
}

interface FrameComparisonProps {
  frameIndex: number;
  similarity: number;
  video1Thumbnail: string;
  video2Thumbnail: string;
}

function FrameComparison({
  frameIndex,
  similarity,
  video1Thumbnail,
  video2Thumbnail,
}: FrameComparisonProps) {
  const isMatch = similarity > 0.8;
  const bgColor = isMatch
    ? "bg-green-50 border-green-200"
    : similarity > 0.5
      ? "bg-yellow-50 border-yellow-200"
      : "bg-red-50 border-red-200";

  const matchColor = isMatch
    ? "text-green-700 bg-green-100"
    : similarity > 0.5
      ? "text-yellow-700 bg-yellow-100"
      : "text-red-700 bg-red-100";

  const matchLabel = isMatch
    ? "Match"
    : similarity > 0.5
      ? "Partial"
      : "Different";

  return (
    <div
      className={`flex items-center gap-4 rounded-lg border p-4 transition ${bgColor}`}
    >
      <div className="flex-shrink-0 text-sm font-medium text-slate-600">
        Frame {frameIndex}
      </div>

      <div className="flex gap-3">
        <img
          src={video1Thumbnail}
          alt={`Frame ${frameIndex} video 1`}
          className="h-16 w-24 rounded border border-slate-200 object-cover"
        />
        <img
          src={video2Thumbnail}
          alt={`Frame ${frameIndex} video 2`}
          className="h-16 w-24 rounded border border-slate-200 object-cover"
        />
      </div>

      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <div className={`rounded-full px-3 py-1 text-sm font-medium ${matchColor}`}>
            {matchLabel}
          </div>
          <span className="text-sm font-semibold text-slate-700">
            {(similarity * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full transition-all ${
              isMatch
                ? "bg-green-500"
                : similarity > 0.5
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${similarity * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
