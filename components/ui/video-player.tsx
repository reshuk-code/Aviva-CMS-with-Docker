"use client";

import { useEffect, useRef, useState } from "react";
import { Expand, LoaderCircle, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { observeVideoTiming } from "@/lib/video-timing";
import { isSafeImageSrc } from "@/lib/rich-text";

function clock(seconds: number) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(value / 3600);
  return `${hours ? `${hours}:` : ""}${String(Math.floor(value / 60) % 60).padStart(hours ? 2 : 1, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function VideoPlayer({ src, title, caption }: { src: string; title?: string; caption?: string | null }) {
  // A source change starts a fresh playback session, including loading/error state.
  return isSafeImageSrc(src) ? <Player key={src} src={src} title={title} caption={caption} /> : null;
}

function Player({ src, title, caption }: { src: string; title?: string; caption?: string | null }) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [buffering, setBuffering] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);

  useEffect(() => {
    const player = video.current;
    if (!player) return;
    return observeVideoTiming(player, (timing) => {
      setDuration(timing.duration);
      setTime(timing.time);
    });
  }, []);

  async function togglePlay() {
    const player = video.current;
    if (!player || error) return;
    if (!player.paused) { player.pause(); return; }
    if (player.ended) player.currentTime = 0;
    try { await player.play(); setNotice(""); }
    catch { setBuffering(false); setNotice("Playback could not start. Please try again."); }
  }

  function seek(value: number) {
    if (!video.current || !duration) return;
    video.current.currentTime = Math.max(0, Math.min(duration, value));
    setTime(video.current.currentTime);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === root.current) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else {
        const player = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
        if (player?.webkitEnterFullscreen) player.webkitEnterFullscreen();
        else setNotice("Fullscreen is unavailable in this browser.");
      }
    } catch { setNotice("Fullscreen could not be opened."); }
  }

  const iconButton = "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-white/85 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40";
  return <div ref={root} data-video-player role="region" aria-label={title || "Video player"} tabIndex={0}
    className="video-player overflow-hidden rounded-xl border border-white/10 bg-zinc-950 text-white shadow-lg focus-visible:outline-2 focus-visible:outline-primary"
    onKeyDown={(event) => {
      if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
      if ([" ", "k", "ArrowLeft", "ArrowRight", "m", "f"].includes(event.key)) event.preventDefault();
      if (event.key === " " || event.key === "k") void togglePlay();
      if (event.key === "ArrowLeft") seek(time - 5);
      if (event.key === "ArrowRight") seek(time + 5);
      if (event.key === "m" && video.current) video.current.muted = !video.current.muted;
      if (event.key === "f") void toggleFullscreen();
    }}>
    <div className="video-player-screen relative flex aspect-video items-center justify-center bg-black">
      <video ref={video} src={src} playsInline preload="metadata" aria-label={title || "Video"}
        className="h-full w-full object-contain"
        onPlay={() => { setPlaying(true); setEnded(false); }} onPause={() => { setPlaying(false); setBuffering(false); }}
        onEnded={() => { setPlaying(false); setEnded(true); setBuffering(false); }}
        onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)} onCanPlay={() => setBuffering(false)}
        onVolumeChange={(event) => { setVolume(event.currentTarget.volume); setMuted(event.currentTarget.muted); }}
        onRateChange={(event) => setSpeed(event.currentTarget.playbackRate)}
        onError={() => { setError("This video could not be loaded or its format is unsupported."); setPlaying(false); setBuffering(false); }} />
      {(caption?.trim() || title) && <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/75 to-transparent px-4 py-3 text-sm font-medium">{caption?.trim() || title}</div>}
      {!playing && !error && <button type="button" aria-label={ended ? "Replay video" : "Play video"} onClick={() => void togglePlay()}
        className="absolute flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
        {ended ? <RotateCcw className="size-7" /> : <Play className="ml-1 size-7 fill-current" />}
      </button>}
      {buffering && <LoaderCircle aria-label="Buffering" className="pointer-events-none absolute size-9 animate-spin" />}
      {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-5 text-center text-sm" role="alert">
        <span>{error}</span><a href={src} className="text-white underline underline-offset-4">Open video file</a>
      </div>}
    </div>
    <div className="space-y-1 px-3 pb-2 pt-3 sm:px-4">
      <input type="range" aria-label="Seek video" aria-valuetext={duration === null ? `${clock(time)}, duration loading` : `${clock(time)} of ${clock(duration)}`} min={0} max={duration || 1} step="any" value={Math.min(time, duration || 1)} disabled={!duration || Boolean(error)} onChange={(event) => seek(Number(event.target.value))} className="block h-2 w-full cursor-pointer accent-primary" />
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" className={iconButton} disabled={Boolean(error)} aria-label={playing ? "Pause" : ended ? "Replay" : "Play"} onClick={() => void togglePlay()}>{playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}</button>
        <span className="mr-auto whitespace-nowrap font-mono text-xs tabular-nums text-white/70">{clock(time)} / {duration === null ? "--:--" : clock(duration)}</span>
        <button type="button" className={iconButton} aria-label={muted || volume === 0 ? "Unmute" : "Mute"} aria-pressed={muted || volume === 0} onClick={() => { if (video.current) { if (video.current.volume === 0) video.current.volume = 1; video.current.muted = !(muted || volume === 0); } }}>{muted || volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button>
        <input type="range" aria-label="Volume" min={0} max={1} step={0.05} value={muted ? 0 : volume} className="mr-2 w-16 accent-primary sm:w-20" onChange={(event) => { if (video.current) { video.current.volume = Number(event.target.value); video.current.muted = false; } }} />
        <select aria-label="Playback speed" value={speed} onChange={(event) => { if (video.current) video.current.playbackRate = Number(event.target.value); }} className="h-9 rounded-lg border border-white/15 bg-zinc-900 px-1 text-xs text-white focus-visible:outline-white">
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
        </select>
        <button type="button" className={iconButton} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize className="size-5" /> : <Expand className="size-5" />}</button>
      </div>
      {notice && <p role="status" className="pb-2 text-xs text-white/80">{notice}</p>}
    </div>
  </div>;
}
