import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
    children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
    const location = useLocation();
    const containerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.classList.remove('page-transition__content--visible');
            containerRef.current.classList.add('page-transition__content--entering');

            timeoutRef.current = setTimeout(() => {
                if (containerRef.current) {
                    containerRef.current.classList.remove('page-transition__content--entering');
                    containerRef.current.classList.add('page-transition__content--visible');
                }
            }, 50);

            return () => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
            };
        }
    }, [location]);

    return (
        <div className="page-transition">
            <div className="page-transition__content" ref={containerRef}>
                {children}
            </div>
        </div>
    );
}
