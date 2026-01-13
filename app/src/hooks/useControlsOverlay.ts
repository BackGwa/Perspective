import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { UI_TIMING } from '../config/constants';
import { VALIDATION } from '../config/design';

const getIsCompactLayout = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia(`(max-width: ${VALIDATION.DESKTOP_BREAKPOINT}px)`).matches;
};

export function useControlsOverlay(overlayRef: RefObject<HTMLElement>) {
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(getIsCompactLayout);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${VALIDATION.DESKTOP_BREAKPOINT}px)`);
    const updateLayout = () => {
      setIsCompactLayout(mediaQuery.matches);
    };

    updateLayout();
    mediaQuery.addEventListener('change', updateLayout);

    return () => {
      mediaQuery.removeEventListener('change', updateLayout);
    };
  }, []);

  useEffect(() => {
    if (isCompactLayout) return;

    setIsOverlayVisible(false);
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, [isCompactLayout]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const hideOverlay = useCallback(() => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsOverlayVisible(false);
  }, []);

  const showOverlay = useCallback(() => {
    if (!isCompactLayout) return;

    setIsOverlayVisible(true);
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsOverlayVisible(false);
    }, UI_TIMING.CONTROLS_OVERLAY_DISPLAY_DURATION);
  }, [isCompactLayout]);

  const handlePointerDown = useCallback((event: { target: EventTarget | null }) => {
    if (!isCompactLayout) return;

    const targetNode = event.target as Node | null;
    const overlayElement = overlayRef.current;
    const clickedInsideOverlay = !!(overlayElement && targetNode && overlayElement.contains(targetNode));

    if (isOverlayVisible) {
      if (!clickedInsideOverlay) {
        hideOverlay();
      }
      return;
    }

    if (!clickedInsideOverlay) {
      showOverlay();
    }
  }, [hideOverlay, isCompactLayout, isOverlayVisible, overlayRef, showOverlay]);

  return {
    isOverlayVisible,
    showOverlay,
    hideOverlay,
    handlePointerDown
  };
}
