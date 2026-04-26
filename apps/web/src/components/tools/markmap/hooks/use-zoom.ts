import { useCallback, useState, type RefObject } from 'react';
import type { Markmap } from 'markmap-view';

export function useZoom(markmapRef: RefObject<Markmap | null> | RefObject<Markmap>) {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.rescale(1.25);
    }
    setZoom(z => Math.min(z * 1.25, 3));
  }, [markmapRef]);

  const handleZoomOut = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.rescale(0.8);
    }
    setZoom(z => Math.max(z * 0.8, 0.5));
  }, [markmapRef]);

  const handleReset = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.fit();
    }
    setZoom(1);
  }, [markmapRef]);

  return { zoom, handleZoomIn, handleZoomOut, handleReset };
}
