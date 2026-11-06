import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Check, Tv } from 'lucide-react';

export interface YouTubePlayerControl {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number) => void;
}

interface CustomYouTubePlayerProps {
  videoUrl: string;
  startAt?: number;
  controlRef?: React.MutableRefObject<YouTubePlayerControl | null>;
  onPlay?: () => void;
  onEnded?: () => void;
  onHeartbeat?: (duration: number) => void;
  onToggleTheater?: () => void;
  isTheater?: boolean;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const QUALITY_LABELS: Record<string, string> = {
  highres: 'Original (4K)',
  hd2160: '2160p (4K)',
  hd1440: '1440p (2K)',
  hd1080: '1080p (HD)',
  hd720: '720p (HD)',
  large: '480p',
  medium: '360p',
  small: '240p',
  tiny: '144p',
  auto: 'Auto',
};

const DEFAULT_QUALITIES = ['auto', 'hd1080', 'hd720', 'large', 'medium', 'small'];

// Stop this close to the end so YouTube never reaches its suggested-videos screen.
const END_GUARD_SECONDS = 1;

const QUALITIES = [
  { id: 'auto', label: 'Auto (HD)' },
  { id: 'hd1080', label: '1080p (Full HD)' },
  { id: 'hd720', label: '720p (HD)' },
  { id: 'large', label: '480p (Standard)' },
  { id: 'medium', label: '360p (Medium)' },
  { id: 'small', label: '240p (Data Saver)' },
];

const extractVideoId = (url: string) => {
  if (!url) return '';
  let cleanUrl = url;
  if (cleanUrl.includes('<iframe')) {
    const match = cleanUrl.match(/src="([^"]+)"/);
    if (match) cleanUrl = match[1];
  }
  let videoId = '';
  if (cleanUrl.includes('youtu.be/')) {
    videoId = cleanUrl.split('youtu.be/')[1].split('?')[0].split('&')[0];
  } else if (cleanUrl.includes('watch?v=')) {
    videoId = cleanUrl.split('watch?v=')[1].split('&')[0].split('#')[0];
  } else if (cleanUrl.includes('embed/')) {
    videoId = cleanUrl.split('embed/')[1].split('?')[0].split('"')[0];
  } else if (cleanUrl.includes('shorts/')) {
    videoId = cleanUrl.split('shorts/')[1].split('?')[0].split('&')[0];
  } else if (cleanUrl.includes('live/')) {
    videoId = cleanUrl.split('live/')[1].split('?')[0].split('&')[0];
  } else if (cleanUrl.includes('v/')) {
    videoId = cleanUrl.split('v/')[1].split('?')[0].split('&')[0];
  }
  return videoId;
};

export const CustomYouTubePlayer: React.FC<CustomYouTubePlayerProps> = ({ 
  videoUrl, 
  startAt = 0,
  controlRef,
  onPlay, 
  onEnded, 
  onHeartbeat,
  onToggleTheater,
  isTheater = false,
}) => {
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onHeartbeatRef = useRef(onHeartbeat);
  onHeartbeatRef.current = onHeartbeat;

  const startAtRef = useRef(startAt);
  startAtRef.current = startAt;

  const videoId = extractVideoId(videoUrl);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const qualityMenuRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>(DEFAULT_QUALITIES);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const selectedQualityRef = useRef(selectedQuality);
  selectedQualityRef.current = selectedQuality;
  const hasStartedRef = useRef(hasStarted);
  hasStartedRef.current = hasStarted;
  const prevVideoIdRef = useRef(videoId);
  const playerContainerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`).current;
  const endHandledRef = useRef(false);

  const finishVideo = () => {
    if (endHandledRef.current) return;
    endHandledRef.current = true;
    setIsPlaying(false);
    setIsEnded(true);
    try {
      playerRef.current?.pauseVideo();
    } catch {}
    onEndedRef.current?.();
  };

  const enforceQuality = (player: any) => {
    try {
      if (!player) return;
      const levels: string[] = typeof player.getAvailableQualityLevels === 'function' ? player.getAvailableQualityLevels() : [];
      const targetQ = selectedQualityRef.current !== 'auto'
        ? selectedQualityRef.current
        : (levels.length > 0 && levels[0] !== 'auto' ? levels[0] : 'hd1080');

      if (typeof player.setPlaybackQuality === 'function') {
        player.setPlaybackQuality(targetQ);
      }
      if (typeof player.setPlaybackQualityRange === 'function') {
        player.setPlaybackQualityRange(targetQ, targetQ);
      }
    } catch {}
  };

  useEffect(() => {
    // If videoId changed and an active player instance exists, switch seamlessly
    if (prevVideoIdRef.current !== videoId) {
      prevVideoIdRef.current = videoId;
      setIsSwitching(true);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsEnded(false);
      endHandledRef.current = false;

      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        try {
          if (hasStartedRef.current) {
            playerRef.current.loadVideoById({
              videoId,
              startSeconds: startAtRef.current,
            });
          } else {
            playerRef.current.cueVideoById({
              videoId,
              startSeconds: startAtRef.current,
            });
          }
          return;
        } catch {
          // Fallback to full re-initialization if loadVideoById throws
        }
      }
    }

    // Load YouTube API script if it doesn't exist
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  const updateQualityLevels = (player: any) => {
    try {
      if (player && typeof player.getAvailableQualityLevels === 'function') {
        const levels: string[] = player.getAvailableQualityLevels();
        if (Array.isArray(levels) && levels.length > 0) {
          const unique = Array.from(new Set(['auto', ...levels]));
          setAvailableQualities(unique);
        }
      }
      if (player && typeof player.getPlaybackQuality === 'function') {
        const current = player.getPlaybackQuality();
        if (current && current !== 'unknown') {
          setCurrentQuality(current);
        }
      }
      enforceQuality(player);
    } catch {}
  };

  const initializePlayer = () => {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    playerRef.current = new window.YT.Player(playerContainerId, {
      width: '100%',
      height: '100%',
      videoId,
      playerVars: {
        autoplay: hasStartedRef.current ? 1 : 0,
        start: Math.floor(startAtRef.current),
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        fs: 1,
        playsinline: 1,
        enablejsapi: 1,
        origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
      events: {
        onReady: (event: any) => {
          setDuration(event.target.getDuration());
          updateQualityLevels(event.target);
          enforceQuality(event.target);
          if (hasStartedRef.current) {
            event.target.playVideo();
          } else {
            setIsSwitching(false);
          }
        },
        onStateChange: (event: any) => {
          // YT.PlayerState: -1 (UNSTARTED), 0 (ENDED), 1 (PLAYING), 2 (PAUSED), 3 (BUFFERING), 5 (CUED)
          if (event.data === window.YT.PlayerState.BUFFERING || event.data === window.YT.PlayerState.PLAYING) {
            enforceQuality(event.target);
          }
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsSwitching(false);
            setHasStarted(true);
            setIsPlaying(true);
            setIsEnded(false);
            endHandledRef.current = false;
            updateQualityLevels(event.target);
            onPlayRef.current?.();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          } else if (event.data === window.YT.PlayerState.CUED) {
            if (!hasStartedRef.current) {
              setIsSwitching(false);
            }
          } else if (event.data === window.YT.PlayerState.ENDED) {
            finishVideo();
          }
        },
        onPlaybackQualityChange: (event: any) => {
          if (event.data && event.data !== 'unknown') {
            setCurrentQuality(event.data);
            // If YouTube downshifted below HD while user target is HD/auto, re-assert quality
            const targetQ = selectedQualityRef.current === 'auto' ? 'hd1080' : selectedQualityRef.current;
            if ((targetQ === 'hd1080' || targetQ === 'hd720') && (event.data === 'medium' || event.data === 'small' || event.data === 'tiny')) {
              enforceQuality(playerRef.current);
            }
          }
        },
      },
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && playerRef.current) {
      interval = setInterval(() => {
        if (playerRef.current) {
          if (typeof playerRef.current.getCurrentTime === 'function') {
            const time = playerRef.current.getCurrentTime();
            setCurrentTime(time);
            const total = typeof playerRef.current.getDuration === 'function' ? playerRef.current.getDuration() : 0;
            if (total > END_GUARD_SECONDS && time >= total - END_GUARD_SECONDS) {
              finishVideo();
              return;
            }
          }
          if (typeof playerRef.current.getVideoLoadedFraction === 'function') {
            setBuffered(playerRef.current.getVideoLoadedFraction() * 100);
          }
          if (typeof playerRef.current.getPlaybackQuality === 'function') {
            const q = playerRef.current.getPlaybackQuality();
            if (q && q !== 'unknown') {
              setCurrentQuality(q);
            }
          }
        }
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout;
    if (isPlaying) {
      heartbeatInterval = setInterval(() => {
        onHeartbeatRef.current?.(10);
      }, 10000);
    }
    return () => clearInterval(heartbeatInterval);
  }, [isPlaying]);

  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
      getDuration: () => playerRef.current?.getDuration?.() ?? 0,
      seekTo: (seconds: number) => {
        playerRef.current?.seekTo?.(seconds, true);
        playerRef.current?.playVideo?.();
      }
    };
    return () => {
      controlRef.current = null;
    };
  }, [controlRef]);

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handlePlayPause = () => {
    if (!playerRef.current || isSwitching) return;
    if (isEnded) {
      setIsEnded(false);
      playerRef.current.seekTo(0, true);
      playerRef.current.playVideo();
      return;
    }
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    const targetTime = (percent / 100) * duration;
    setHoverPosition(percent);
    setHoverTime(targetTime);

    // If clicking and dragging
    if (e.buttons === 1 && playerRef.current) {
      setCurrentTime(targetTime);
      playerRef.current.seekTo(targetTime, true);
    }
  };

  const handleTrackMouseLeave = () => {
    setHoverPosition(null);
    setHoverTime(null);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!trackRef.current || duration <= 0 || !playerRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const targetTime = percent * duration;
    setCurrentTime(targetTime);
    playerRef.current.seekTo(targetTime, true);
    // Playback stops at the end screen, so seeking back has to resume it.
    if (isEnded) playerRef.current.playVideo();
  };

  const handleVolumeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
      if (volume === 0) setVolume(100);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (playerRef.current) {
      playerRef.current.setVolume(vol);
      if (vol === 0) {
        setIsMuted(true);
        playerRef.current.mute();
      } else if (isMuted) {
        setIsMuted(false);
        playerRef.current.unMute();
      }
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    setShowQualityMenu(false);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(rate);
    }
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    setShowQualityMenu(false);
    if (playerRef.current) {
      const targetQ = quality === 'auto' ? 'default' : quality;
      try {
        if (typeof playerRef.current.setPlaybackQuality === 'function') {
          playerRef.current.setPlaybackQuality(targetQ);
        }
        if (typeof playerRef.current.setPlaybackQualityRange === 'function') {
          playerRef.current.setPlaybackQualityRange(targetQ, targetQ);
        }
      } catch (err) {
        console.warn('Could not set playback quality hint:', err);
      }
      // Note: We deliberately do NOT call loadVideoById here, because reloading mid-stream
      // drops player buffer and forces YouTube's ABR to fall back to 360p low-latency bitrate.
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target as Node)) {
        setShowQualityMenu(false);
      }
    };
    if (showQualityMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQualityMenu]);

  const getDisplayQualityLabel = () => {
    // Determine active resolution: prefer live streaming quality if available
    const activeQ = currentQuality && currentQuality !== 'auto' && currentQuality !== 'unknown' 
      ? currentQuality 
      : selectedQuality;

    let qText = 'Auto';
    if (activeQ === 'highres' || activeQ === 'hd2160') qText = '4K';
    else if (activeQ === 'hd1440') qText = '1440p';
    else if (activeQ === 'hd1080') qText = '1080p HD';
    else if (activeQ === 'hd720') qText = '720p HD';
    else if (activeQ === 'large') qText = '480p';
    else if (activeQ === 'medium') qText = '360p';
    else if (activeQ === 'small') qText = '240p';
    else if (activeQ === 'tiny') qText = '144p';
    else if (QUALITY_LABELS[activeQ]) qText = QUALITY_LABELS[activeQ].split(' ')[0];

    return playbackRate === 1 ? qText : `${qText} • ${playbackRate}x`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full h-full aspect-video bg-black select-none ${isFullscreen ? 'rounded-none' : 'rounded-xl'} overflow-hidden group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* The IFrame Layer with vertical letterbox masking: Hides YouTube header & watermark with 0% video crop */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div 
          style={{ 
            position: 'absolute', 
            top: '-18%', 
            left: '0', 
            width: '100%', 
            height: '136%' 
          }}
          className="[&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0"
        >
          <div id={playerContainerId} className="w-full h-full" />
        </div>
      </div>

      {/* Video Switching & Pre-start Mask Layer: 100% hides YouTube loading splash, thumbnail, and native play button */}
      {(!hasStarted || isSwitching) && (
        <div 
          className="absolute inset-0 z-25 bg-zinc-950 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-300"
          onClick={handlePlayPause}
        >
          {isSwitching ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
              <span className="text-xs font-medium text-zinc-300 tracking-wide">Loading lesson...</span>
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110">
              <Play className="w-8 h-8 text-white ml-1 fill-white" />
            </div>
          )}
        </div>
      )}

      {/* Interceptor & Custom Paused Overlay: Completely masks YouTube native animated play/pause icon */}
      <div
        onClick={() => {
          if (showQualityMenu) {
            setShowQualityMenu(false);
          } else {
            handlePlayPause();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={`absolute inset-0 cursor-pointer z-20 transition-all duration-200 ${
          hasStarted && !isPlaying && !isEnded && !isSwitching
            ? 'bg-black/45 backdrop-blur-[1px] flex items-center justify-center'
            : 'bg-transparent'
        }`}
      >
        {hasStarted && !isPlaying && !isEnded && !isSwitching && (
          <div className="w-16 h-16 bg-red-600/95 hover:bg-red-600 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110">
            <Play className="w-8 h-8 text-white ml-1 fill-white" />
          </div>
        )}
      </div>

      {/* End-screen shield (prevents YouTube recommended related videos) */}
      {isEnded && (
        <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center mb-4 text-red-500">
            <Check size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Video Finished</h3>
          <p className="text-sm text-zinc-400 max-w-sm mb-6">You have reached the end of this video.</p>
          <button
            type="button"
            onClick={() => {
              setIsEnded(false);
              if (playerRef.current) {
                playerRef.current.seekTo(0, true);
                playerRef.current.playVideo();
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-all shadow-lg hover:scale-105"
          >
            <Play size={16} className="fill-white" />
            Watch Again
          </button>
        </div>
      )}

      {/* Custom Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 px-4 pb-3.5 pt-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-30 transition-opacity duration-300 ${
          isHovered || !isPlaying || showQualityMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
          {/* Minimal Interactive Progress Track */}
          <div 
            ref={trackRef}
            className="relative py-2.5 cursor-pointer group/track select-none -mx-1 px-1"
            onClick={handleTrackClick}
            onMouseMove={handleTrackMouseMove}
            onMouseLeave={handleTrackMouseLeave}
          >
            {/* Hover Time Tooltip Bubble */}
            {hoverTime !== null && hoverPosition !== null && (
              <div 
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-zinc-950/95 border border-white/20 text-[10px] font-mono font-bold text-white shadow-xl pointer-events-none transition-all duration-75"
                style={{ left: `${hoverPosition}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Track Rail */}
            <div className="relative w-full h-[3px] group-hover/track:h-[5px] bg-white/20 rounded-full overflow-hidden transition-all duration-150">
              {/* Buffered Bar */}
              <div 
                className="absolute top-0 bottom-0 left-0 bg-white/25 rounded-full transition-all duration-200"
                style={{ width: `${buffered}%` }}
              />
              {/* Played Bar */}
              <div 
                className="absolute top-0 bottom-0 left-0 bg-red-600 rounded-full transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Minimal Scrubber Knob (Expands seamlessly on hover) */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-red-600 rounded-full shadow-lg ring-2 ring-white scale-0 group-hover/track:scale-100 transition-transform duration-150 pointer-events-none"
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          {/* Control Buttons Row with Compact Minimal Time */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                className="text-white hover:text-red-500 transition-colors p-1"
              >
                {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5 fill-white" />}
              </button>
              
              <div className="flex items-center gap-2 group/vol" onClick={e => e.stopPropagation()}>
                <button 
                  onClick={handleVolumeToggle}
                  className="text-white hover:text-gray-300 transition-colors p-1"
                >
                  {isMuted || volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 opacity-0 group-hover/vol:w-16 group-hover/vol:opacity-100 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white transition-all duration-200 ease-out"
                />
              </div>

              {/* Minimal Clean Time Counter */}
              <div className="text-[11px] font-mono font-medium text-white/80 select-none pl-1 flex items-center gap-1.5">
                <span>{formatTime(currentTime)}</span>
                <span className="text-white/30">/</span>
                <span className="text-white/50">{formatTime(duration)}</span>
              </div>
            </div>

          <div className="flex items-center gap-2">
            {/* Settings & Quality Menu */}
            <div className="relative" ref={qualityMenuRef} onClick={e => e.stopPropagation()}>
              <button 
                type="button"
                onClick={() => setShowQualityMenu(prev => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition-all border border-white/10 shadow-sm"
                title="Playback Settings"
              >
                <Settings size={15} className={showQualityMenu ? 'rotate-90 transition-transform duration-200 text-red-500' : 'transition-transform duration-200'} />
                <span className="text-[11px] font-semibold tracking-wide">
                  {getDisplayQualityLabel()}
                </span>
              </button>

              {/* Settings Dropdown Popover */}
              {showQualityMenu && (
                <div 
                  className="absolute bottom-full right-0 mb-2 w-64 bg-zinc-950/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-3 z-40 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Active Stream Quality Status */}
                  <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-medium">Active Stream:</span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {QUALITY_LABELS[currentQuality] || currentQuality || 'Auto (HD)'}
                    </span>
                  </div>

                  {/* Video Quality Options */}
                  <div className="mb-3">
                    <div className="px-1 py-1 text-[10px] font-bold tracking-wider uppercase text-zinc-400 border-b border-white/10 mb-1 flex items-center justify-between">
                      <span>Quality Preference</span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        {selectedQuality === 'auto' ? 'Adaptive' : selectedQuality}
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
                      {QUALITIES.map((q) => {
                        const isSelected = selectedQuality === q.id;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => handleQualityChange(q.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left ${
                              isSelected 
                                ? 'bg-red-600/25 text-red-400 font-semibold border border-red-500/20' 
                                : 'text-zinc-200 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span>{q.label}</span>
                            {isSelected && <Check size={14} className="text-red-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* HD Quality Tip & One-Click Fullscreen/Theater */}
                  <div className="mb-3 p-2 rounded-lg bg-red-950/20 border border-red-500/20 text-[10px] text-zinc-300 space-y-1.5">
                    <p className="leading-relaxed">
                      💡 <strong className="text-white">HD Tip:</strong> YouTube adjusts resolution to player size. Enter Fullscreen or Theater Mode for 1080p HD.
                    </p>
                    <div className="flex gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          setShowQualityMenu(false);
                          toggleFullscreen(e);
                        }}
                        className="flex-1 py-1 px-2 rounded bg-white/10 hover:bg-white/20 text-white font-medium text-[10px] text-center transition-colors"
                      >
                        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      </button>
                      {onToggleTheater && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowQualityMenu(false);
                            onToggleTheater();
                          }}
                          className="flex-1 py-1 px-2 rounded bg-red-600/80 hover:bg-red-600 text-white font-medium text-[10px] text-center transition-colors"
                        >
                          {isTheater ? 'Exit Theater' : 'Theater Mode'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Playback Speed */}
                  <div>
                    <div className="px-1 py-1 text-[10px] font-bold tracking-wider uppercase text-zinc-400 border-b border-white/10 mb-1 flex items-center justify-between">
                      <span>Playback Speed</span>
                      <span className="text-[9px] text-zinc-400">{playbackRate}x</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 pt-0.5">
                      {[0.75, 1, 1.25, 1.5, 2].map(rate => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => handleSpeedChange(rate)}
                          className={`py-1 text-center text-xs rounded-md font-medium transition-colors ${
                            playbackRate === rate
                              ? 'bg-red-600 text-white font-bold'
                              : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {rate === 1 ? '1x' : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Theater Mode Button */}
            {onToggleTheater && (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleTheater(); }}
                className={`p-1.5 rounded-lg transition-colors ${
                  isTheater ? 'text-red-500 bg-red-500/15' : 'text-white hover:text-gray-300 hover:bg-white/10'
                }`}
                title={isTheater ? 'Exit Theater Mode' : 'Theater Mode (Wide HD View)'}
              >
                <Tv size={18} />
              </button>
            )}

            {/* Fullscreen Button */}
            <button 
              type="button"
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors p-1.5 rounded-lg hover:bg-white/10"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Ambient Minimal Progress Line (Always visible at the bottom edge when controls fade out during playback) */}
      {hasStarted && isPlaying && !isHovered && !showQualityMenu && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 pointer-events-none z-30 transition-opacity duration-300">
          <div 
            className="h-full bg-red-600 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};
