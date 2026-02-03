# ClipCert
https://www.clipcert.com
> Frame-by-frame video comparison tool for content verification and authenticity checking

ClipCert is a web application to assist in verification of video authenticity by comparing video content.

## ✨ Features

- **🎥 Frame-by-Frame Analysis** - Extracts and compares every frame from two videos
- **📊 Visual Timeline** - Interactive timeline showing similarity scores across the entire video duration
- **🔍 Detailed Comparison** - Zoom in on specific frames to examine differences
- **🎨 Similarity Scoring** - Advanced perceptual hashing and pixel comparison algorithms
- **🔒 Privacy-First** - All processing happens client-side; videos and data are never stored on servers
- **⚡ Real-Time Progress** - Live progress updates during frame extraction and comparison
- **📱 Responsive Design** - Beautiful gradient UI that works on desktop and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (or 20.19.0+, 22.12.0+)
- pnpm 10+ (recommended) or npm 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/clipcert.git
cd clipcert

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The application will be available at `http://localhost:8080`

## 📖 How It Works

1. **Upload Videos** - Select two video files you want to compare (supports .mp4, .mov, .webm, .mkv)
2. **Automatic Extraction** - ClipCert extracts frames from both videos with precise time-stepping
3. **Frame Comparison** - Each corresponding frame is analyzed using:
   - Perceptual hashing for quick similarity detection
   - Pixel-by-pixel comparison for accuracy
   - Center-crop region analysis (250x250px)
4. **Visual Results** - View results in an interactive timeline and detailed frame-by-frame breakdown

### Similarity Thresholds

- **80%+** - Match (frames are considered identical)
- **50-80%** - Partial match (similar but with differences)
- **<50%** - Different (significant variations detected)

## 🛠️ Tech Stack

**Frontend:**
- ⚛️ React 18 with TypeScript
- 🎨 TailwindCSS 3 for styling
- 🎭 Radix UI components
- 🔄 React Router 6 (SPA mode)
- 🎬 Custom video processing utilities

**Backend:**
- 🚂 Express.js server
- 🔌 Integrated with Vite dev server

**Build Tools:**
- ⚡ Vite for lightning-fast development
- 📦 pnpm for efficient package management
- 🧪 Vitest for testing

## 📁 Project Structure

```
clipcert/
├── client/              # React SPA frontend
│   ├── pages/          # Route components
│   ├── components/ui/  # Reusable UI components
│   ├── lib/           # Utility functions including video processing
│   ├── App.tsx        # Main app with routing
│   └── global.css     # TailwindCSS theme
├── server/             # Express API backend
│   ├── routes/        # API route handlers
│   └── index.ts       # Server configuration
├── shared/             # Shared types between client & server
└── public/             # Static assets
```

## 🔧 Development

### Available Scripts

```bash
pnpm dev          # Start development server (port 8080)
pnpm build        # Build for production
pnpm start        # Run production server
pnpm test         # Run tests with Vitest
pnpm typecheck    # TypeScript validation
```

### Key Components

- **Index.tsx** - Main video comparison interface
- **video-utils.ts** - Frame extraction and comparison algorithms
  - `extractFrames()` - Extracts frames with center-crop
  - `compareFrames()` - Pixel-by-pixel similarity calculation
  - `hashFrame()` - Perceptual hashing for quick comparisons

## 🎯 Use Cases

- **Content Verification** - Verify if two videos are the same
- **Deepfake Detection** - Identify manipulated content
- **Version Comparison** - Compare different edits of the same video
- **Copyright Protection** - Detect unauthorized video copies
- **Quality Assurance** - Ensure video processing hasn't introduced artifacts

## 🔒 Privacy & Security

- ✅ All video processing happens **client-side in your browser**
- ✅ Videos are **never uploaded** to any server
- ✅ No data collection or tracking
- ✅ No cookies or local storage of video data
- ✅ Complete data privacy and security

## 🚢 Deployment

ClipCert can be easily deployed to:

- **Netlify** - Use the included `netlify.toml` configuration
- **Vercel** - Compatible with Vercel's deployment system
- **Docker** - Containerize using the provided `.dockerignore`
- **Self-hosted** - Build and run on your own infrastructure

### Production Build

```bash
# Build both client and server
pnpm build

# Start production server
pnpm start
```

The production build creates:
- `dist/spa/` - Static frontend assets
- `dist/server/` - Built Node.js server

## 🙏 Acknowledgments

- Pure AI slop created and used for experimental purposes

