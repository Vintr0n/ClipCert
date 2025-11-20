import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  extractFrames,
  compareFrames,
  generateFrameThumbnail,
} from "@/lib/video-utils";
import {
  Play,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ZoomIn,
} from "lucide-react";

interface FrameComparison {
  frameIndex: number;
  similarity: number;
  video1Thumbnail: string;
  video2Thumbnail: string;
}

const FRAME_INTERVAL = 1; // Extract all frames for accuracy (ignored in new implementation)
const CROP_SIZE = 250; // Center crop size

export default function Index() {
  const [video1, setVideo1] = useState<File | null>(null);
  const [video2, setVideo2] = useState<File | null>(null);
  const [video1Preview, setVideo1Preview] = useState<string>("");
  const [video2Preview, setVideo2Preview] = useState<string>("");
  const [isComparing, setIsComparing] = useState(false);
  const [comparisons, setComparisons] = useState<FrameComparison[]>([]);
  const [comparisonProgress, setComparisonProgress] = useState(0);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(
    null,
  );
  const [enlargedImages, setEnlargedImages] = useState<{
    video1: string;
    video2: string;
    frameIndex: number;
  } | null>(null);
  const frameListRef = useRef<HTMLDivElement>(null);
  const frameItemsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  const handleVideoSelect = (file: File, isVideo1: boolean) => {
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
    setSelectedFrameIndex(null);

    try {
      setComparisonProgress(2);

      // Extract frames from video 1 (2-40% progress)
      const frames1 = await extractFrames(video1, FRAME_INTERVAL, CROP_SIZE, (progress) => {
        // Scale video 1 extraction to 2-40%
        setComparisonProgress(2 + Math.floor((progress / 100) * 38));
      });

      // Extract frames from video 2 (42-80% progress)
      setComparisonProgress(42);
      const frames2 = await extractFrames(video2, FRAME_INTERVAL, CROP_SIZE, (progress) => {
        // Scale video 2 extraction to 42-80%
        setComparisonProgress(42 + Math.floor((progress / 100) * 38));
      });

      // Compare frames (82-98% progress) with non-blocking batches
      const frameComparisons: FrameComparison[] = [];
      const minFrames = Math.min(frames1.length, frames2.length);

      // Process frames in batches to avoid blocking the UI
      const batchSize = Math.max(1, Math.floor(minFrames / 100)); // ~100 batches

      const processBatch = (startIdx: number) => {
        return new Promise<void>((batchResolve) => {
          const endIdx = Math.min(startIdx + batchSize, minFrames);

          for (let i = startIdx; i < endIdx; i++) {
            const similarity = compareFrames(frames1[i], frames2[i]);
            frameComparisons.push({
              frameIndex: i,
              similarity,
              video1Thumbnail: getThumbnailUrl(frames1[i]),
              video2Thumbnail: getThumbnailUrl(frames2[i]),
            });
          }

          // Update progress
          const progressPercent = Math.floor((endIdx / minFrames) * 16) + 82; // 82-98%
          setComparisonProgress(progressPercent);

          if (endIdx >= minFrames) {
            batchResolve();
          } else {
            // Yield control back to browser before processing next batch
            setTimeout(() => {
              processBatch(endIdx).then(batchResolve);
            }, 0);
          }
        });
      };

      await processBatch(0);

      setComparisons(frameComparisons);
      setComparisonProgress(100);
    } catch (error) {
      console.error("Error comparing videos:", error);
    } finally {
      setIsComparing(false);
    }
  };

  const getThumbnailUrl = (imageData: ImageData): string => {
    return generateFrameThumbnail(imageData, 100, 60);
  };

  const handleTimelineClick = (frameIndex: number) => {
    setSelectedFrameIndex(frameIndex);
    // Scroll to the frame item
    setTimeout(() => {
      const element = frameItemsRef.current.get(frameIndex);
      if (element && frameListRef.current) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 0);
  };

  const handleImageClick = (
    frameIndex: number,
    video1Src: string,
    video2Src: string,
  ) => {
    setEnlargedImages({
      video1: video1Src,
      video2: video2Src,
      frameIndex,
    });
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-600 opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-cyan-600 opacity-20 blur-3xl"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mb-6">
            <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg md:text-7xl">
              ClipCert
            </h1>
          </div>
          <p className="mt-4 text-xl text-slate-300">
            Submit two videos and analyse frame-by-frame similarity with visual
            timeline
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Videos and video data are not stored
          </p>
        </div>

        {/* Upload Panels */}
        <div className="mb-12 grid gap-8 lg:grid-cols-2">
          <VideoUploadPanel
            title="Video 1"
            selected={video1 !== null}
            preview={video1Preview}
            onFileSelect={(file) => handleVideoSelect(file, true)}
            onRemove={() => {
              setVideo1(null);
              setVideo1Preview("");
              setComparisons([]);
            }}
          />

          <VideoUploadPanel
            title="Video 2"
            selected={video2 !== null}
            preview={video2Preview}
            onFileSelect={(file) => handleVideoSelect(file, false)}
            onRemove={() => {
              setVideo2(null);
              setVideo2Preview("");
              setComparisons([]);
            }}
          />
        </div>

        {/* Compare Button */}
        <div className="mb-16 flex justify-center">
          <div className="relative">
            <Button
              onClick={handleCompare}
              disabled={!video1 || !video2 || isComparing}
              size="lg"
              className="relative gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 px-10 py-7 text-lg font-semibold text-white shadow-lg transition hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50"
            >
              {isComparing ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Analyzing Frames... {Math.round(comparisonProgress)}%
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Compare Videos
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Image Comparison Modal */}
        {enlargedImages && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={() => setEnlargedImages(null)}
          >
            <div
              className="relative w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setEnlargedImages(null)}
                className="absolute -top-8 right-0 z-10 text-white hover:text-slate-300 transition"
              >
                <X className="h-8 w-8" />
              </button>
              <div className="space-y-2">
                <p className="text-sm text-slate-300 text-center">
                  Frame {enlargedImages.frameIndex + 1} Comparison
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-slate-400 mb-2">Video 1</p>
                    <img
                      src={enlargedImages.video1}
                      alt="Video 1 frame"
                      className="rounded-lg border border-blue-400/50 w-full h-auto object-contain max-h-96"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-slate-400 mb-2">Video 2</p>
                    <img
                      src={enlargedImages.video2}
                      alt="Video 2 frame"
                      className="rounded-lg border border-cyan-400/50 w-full h-auto object-contain max-h-96"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {comparisons.length > 0 && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Total Frames"
                value={stats.totalFrames}
                icon="frames"
              />
              <StatCard
                label="Matched Frames"
                value={stats.matchedFrames}
                icon="match"
              />
              <StatCard
                label="Avg Similarity"
                value={`${stats.averageSimilarity}%`}
                icon="similarity"
              />
            </div>

            {/* Timeline Section - Always Visible */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="space-y-4">
                {/* Timeline Header with Toggle */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    Comparison Timeline
                  </h2>
                  <button
                    onClick={() => setTimelineExpanded(!timelineExpanded)}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/20"
                  >
                    <span>{comparisons.length} frames</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        timelineExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Visual Timeline Bar */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 overflow-x-auto">
                      <div
                        className="inline-flex gap-px rounded-lg bg-white/10 p-2"
                        style={{
                          minWidth: "100%",
                          minHeight: "44px",
                        }}
                      >
                        {comparisons.map((comparison) => {
                          const isMatch = comparison.similarity > 0.8;
                          const isPartial = comparison.similarity > 0.5;
                          const bgColor = isMatch
                            ? "bg-green-500"
                            : isPartial
                              ? "bg-yellow-500"
                              : "bg-red-500";
                          const isSelected =
                            selectedFrameIndex === comparison.frameIndex;

                          // Calculate optimal segment width
                          // Scales down as frame count increases
                          let width: string;
                          const frameCount = comparisons.length;

                          if (frameCount > 800) {
                            width = "2px";
                          } else if (frameCount > 400) {
                            width = "3px";
                          } else if (frameCount > 200) {
                            width = "4px";
                          } else if (frameCount > 100) {
                            width = "6px";
                          } else {
                            width = "8px";
                          }

                          return (
                            <button
                              key={comparison.frameIndex}
                              onClick={() =>
                                handleTimelineClick(comparison.frameIndex)
                              }
                              style={{
                                width,
                                height: "32px",
                                flexShrink: 0,
                                gap: 0,
                              }}
                              className={`rounded transition hover:opacity-90 ${bgColor} ${
                                isSelected
                                  ? "ring-1 ring-white ring-offset-1 ring-offset-slate-900"
                                  : ""
                              }`}
                              title={`Frame ${comparison.frameIndex + 1}: ${(comparison.similarity * 100).toFixed(0)}%`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-green-500"></div>
                      <span className="text-slate-400">Match (80%+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-yellow-500"></div>
                      <span className="text-slate-400">Partial (50-80%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-red-500"></div>
                      <span className="text-slate-400">
                        Different (&lt;50%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible Frame Details */}
            {timelineExpanded && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <h2 className="mb-6 text-2xl font-bold text-white">
                  Frame-by-Frame Analysis
                </h2>
                <div
                  ref={frameListRef}
                  className="space-y-2 max-h-96 overflow-y-auto"
                >
                  {comparisons.map((comparison) => (
                    <div
                      key={comparison.frameIndex}
                      ref={(el) => {
                        if (el) {
                          frameItemsRef.current.set(comparison.frameIndex, el);
                        }
                      }}
                      onClick={() => handleTimelineClick(comparison.frameIndex)}
                    >
                      <FrameComparisonItem
                        frameIndex={comparison.frameIndex}
                        similarity={comparison.similarity}
                        video1Thumbnail={comparison.video1Thumbnail}
                        video2Thumbnail={comparison.video2Thumbnail}
                        isSelected={
                          selectedFrameIndex === comparison.frameIndex
                        }
                        onImageClick={handleImageClick}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
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
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}

function VideoUploadPanel({
  title,
  selected,
  preview,
  onFileSelect,
  onRemove,
}: VideoUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="group relative">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 blur-xl opacity-0 transition group-hover:opacity-100"></div>
      <div className="relative rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10">
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button
                onClick={onRemove}
                className="inline-flex items-center justify-center rounded-lg bg-red-500/20 p-2 transition hover:bg-red-500/30"
              >
                <X className="h-5 w-5 text-red-400" />
              </button>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
              <video
                src={preview}
                controls
                className="h-full w-full object-cover"
              />
            </div>
            <p className="text-xs text-slate-500">
              Videos and video data are not stored on our servers
            </p>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer space-y-4 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600/30 to-cyan-600/30">
              <Upload className="h-8 w-8 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-slate-300">
                Click to submit or drag and drop
              </p>
              <p className="text-xs text-slate-500">
                Videos and video data are not stored
              </p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mov,.mp4,.webm,.mkv,image/heic,image/heif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onFileSelect(file);
            }
          }}
          className="hidden"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: "frames" | "match" | "similarity";
}

function StatCard({ label, value, icon }: StatCardProps) {
  const getIcon = () => {
    switch (icon) {
      case "match":
        return <CheckCircle2 className="h-6 w-6 text-green-400" />;
      case "similarity":
        return <AlertCircle className="h-6 w-6 text-purple-400" />;
      default:
        return <Play className="h-6 w-6 text-blue-400" />;
    }
  };

  const bgGradient =
    icon === "match"
      ? "from-green-600/20 to-emerald-600/20"
      : icon === "similarity"
        ? "from-purple-600/20 to-pink-600/20"
        : "from-blue-600/20 to-cyan-600/20";

  return (
    <div
      className={`rounded-xl border border-white/10 bg-gradient-to-br ${bgGradient} p-6 backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-300">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <div className="text-slate-400">{getIcon()}</div>
      </div>
    </div>
  );
}

interface FrameComparisonItemProps {
  frameIndex: number;
  similarity: number;
  video1Thumbnail: string;
  video2Thumbnail: string;
  isSelected?: boolean;
  onImageClick?: (frameIndex: number, video1: string, video2: string) => void;
}

function FrameComparisonItem({
  frameIndex,
  similarity,
  video1Thumbnail,
  video2Thumbnail,
  isSelected = false,
  onImageClick,
}: FrameComparisonItemProps) {
  const isMatch = similarity > 0.8;
  const isPartial = similarity > 0.5;

  const statusLabel = isMatch ? "Match" : isPartial ? "Partial" : "Different";
  const statusColor = isMatch
    ? "text-green-400"
    : isPartial
      ? "text-yellow-400"
      : "text-red-400";

  const statusBg = isMatch
    ? "bg-green-500/20"
    : isPartial
      ? "bg-yellow-500/20"
      : "bg-red-500/20";

  const progressBg = isMatch
    ? "bg-green-500"
    : isPartial
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div
      className={`group cursor-pointer rounded-lg border transition ${
        isSelected
          ? "border-white/40 bg-white/15"
          : "border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="min-w-max text-sm font-medium text-slate-400">
            Frame {frameIndex + 1}
          </div>

          <div className="flex gap-2">
            <div className="group relative">
              <img
                src={video1Thumbnail}
                alt={`Frame ${frameIndex} video 1`}
                className="h-14 w-20 rounded border border-white/20 object-cover cursor-pointer transition hover:border-blue-400"
                onClick={() =>
                  onImageClick?.(frameIndex, video1Thumbnail, video2Thumbnail)
                }
              />
              <ZoomIn className="absolute inset-0 m-auto h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition pointer-events-none" />
            </div>
            <div className="group relative">
              <img
                src={video2Thumbnail}
                alt={`Frame ${frameIndex} video 2`}
                className="h-14 w-20 rounded border border-white/20 object-cover cursor-pointer transition hover:border-cyan-400"
                onClick={() =>
                  onImageClick?.(frameIndex, video1Thumbnail, video2Thumbnail)
                }
              />
              <ZoomIn className="absolute inset-0 m-auto h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition pointer-events-none" />
            </div>
          </div>

          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${statusBg} ${statusColor}`}
              >
                {isMatch ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : isPartial ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                {statusLabel}
              </div>
              <span className="text-sm font-semibold text-slate-200">
                {(similarity * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-all duration-500 ${progressBg}`}
                style={{ width: `${similarity * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
