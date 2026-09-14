import React, { useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';

interface VideoPlayerProps {
  videoUrl: string;
  subtitlesUrl?: string;
  initialTime?: number;
  onProgress?: (currentTime: number) => void;
  onEnded?: () => void;
  className?: string;
}

// react-player v3: a ref aponta para o proprio elemento de midia (HTMLVideoElement,
// ou o custom element do YouTube), que expoe a API nativa como currentTime.
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  subtitlesUrl,
  initialTime = 0,
  onProgress,
  onEnded,
  className = ""
}) => {
  const playerRef = useRef<HTMLVideoElement>(null);
  const isReadyRef = useRef(false);

  // Trocar de aula recarrega a midia, entao o seek so vale depois do novo onReady.
  useEffect(() => {
    isReadyRef.current = false;
  }, [videoUrl]);

  const seekToInitialTime = () => {
    if (playerRef.current && initialTime > 0) {
      playerRef.current.currentTime = initialTime;
    }
  };

  // O progresso salvo vem de uma chamada assincrona e pode chegar depois que o
  // player ja esta pronto; nesse caso o seek acontece quando o valor muda.
  useEffect(() => {
    if (isReadyRef.current) {
      seekToInitialTime();
    }
  }, [initialTime]);

  const handleReady = () => {
    isReadyRef.current = true;
    // O ReactPlayer v3 so repassa uma lista fixa de atributos ao <video> e
    // controlsList nao esta nela, entao o atributo vai direto no elemento.
    playerRef.current?.setAttribute('controlslist', 'nodownload');
    seekToInitialTime();
  };

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    if (onProgress) {
      onProgress(Math.floor(event.currentTarget.currentTime));
    }
  };

  return (
    <div className={`relative w-full aspect-video bg-black overflow-hidden rounded-xl shadow-lg ${className}`}>
      <ReactPlayer
        ref={playerRef}
        src={videoUrl}
        width="100%"
        height="100%"
        controls
        // So legenda de outra origem exige CORS; aplicar sempre quebraria URLs
        // pre-assinadas de buckets sem cabecalho CORS configurado.
        crossOrigin={subtitlesUrl ? "anonymous" : undefined}
        onReady={handleReady}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onEnded}
      >
        {subtitlesUrl && (
          <track kind="subtitles" src={subtitlesUrl} srcLang="pt" label="Português" default />
        )}
      </ReactPlayer>
    </div>
  );
};
