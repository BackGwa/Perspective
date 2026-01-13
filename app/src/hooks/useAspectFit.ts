import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

type FitStyle = {
  width: string;
  height: string;
};

export function useAspectFit(containerRef: RefObject<HTMLElement>) {
  const [frameStyle, setFrameStyle] = useState<FitStyle>({ width: '100%', height: '100%' });
  const aspectRef = useRef<number | null>(null);

  const updateFit = useCallback(() => {
    const container = containerRef.current;
    const aspect = aspectRef.current;
    if (!container || !aspect) return;

    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;

    const containerAspect = width / height;
    if (containerAspect > aspect) {
      setFrameStyle({ width: 'auto', height: '100%' });
    } else {
      setFrameStyle({ width: '100%', height: 'auto' });
    }
  }, [containerRef]);

  const setAspect = useCallback((width: number, height: number) => {
    if (!width || !height) return;

    aspectRef.current = width / height;
    updateFit();
  }, [updateFit]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => updateFit());
    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef, updateFit]);

  return {
    frameStyle,
    setAspect
  };
}
