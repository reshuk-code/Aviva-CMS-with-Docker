export interface VideoTiming {
  time: number;
  duration: number | null;
}

/** Metadata may already be loaded before React hydrates or mounts the controls. */
export function observeVideoTiming(
  player: HTMLMediaElement,
  onChange: (timing: VideoTiming) => void,
): () => void {
  let active = true;
  let duration: number | null = null;
  const sync = () => {
    if (!active) return;
    if (player.readyState === 0) duration = null;
    else if (Number.isFinite(player.duration) && player.duration > 0) duration = player.duration;
    // Buffered/seekable ranges only describe available data, not total length.
    onChange({
      time: Number.isFinite(player.currentTime) ? Math.max(0, player.currentTime) : 0,
      duration,
    });
  };
  const events = ["loadedmetadata", "durationchange", "loadeddata", "canplay", "progress", "timeupdate", "seeked", "ended", "emptied"];
  for (const event of events) player.addEventListener(event, sync);
  queueMicrotask(sync);
  return () => {
    active = false;
    for (const event of events) player.removeEventListener(event, sync);
  };
}
