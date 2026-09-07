import React, { useRef } from 'react';
import ReactPlayer from 'react-player';

interface VideoPlayerProps {
  videoUrl: string;
  subtitlesUrl?: string;
  initialTime?: number;
  onProgress?: (currentTime: number) => void;
  onEnded?: () => void;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  videoUrl, 
  subtitlesUrl, 
  initialTime = 0,
  onProgress, 
  onEnded,
  className = ""
}) => {
  const playerRef = useRef<ReactPlayer>(null);

  const handleProgress = (state: { playedSeconds: number }) => {
    if (onProgress) {
      onProgress(Math.floor(state.playedSeconds));
    }
  };

  const handleReady = () => {
    if (initialTime > 0 && playerRef.current) {
      playerRef.current.seekTo(initialTime, 'seconds');
    }
  };

  return (
    <div className={`relative w-full aspect-video bg-black overflow-hidden rounded-xl shadow-lg ${className}`}>
      <ReactPlayer
        ref={playerRef}
        url={videoUrl}
        width="100%"
        height="100%"
        controls={true}
        onProgress={handleProgress}
        onEnded={onEnded}
        onReady={handleReady}
        config={{
          file: {
            attributes: {
              crossOrigin: "anonymous",
              controlsList: "nodownload"
            },
            tracks: subtitlesUrl ? [
              {
                kind: 'subtitles',
                src: subtitlesUrl,
                srcLang: 'pt',
                label: 'Português',
                default: true
              }
            ] : []
          }
        }}
      />
    </div>
  );
};
