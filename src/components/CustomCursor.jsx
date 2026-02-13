import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

const CustomCursor = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const springConfig = { damping: 25, stiffness: 200 };
    const cursorX = useSpring(0, springConfig);
    const cursorY = useSpring(0, springConfig);

    useEffect(() => {
        // Detect touch device or small screen
        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        if (isTouch) return;

        setIsVisible(true);

        const mouseMove = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
            cursorX.set(e.clientX - 10);
            cursorY.set(e.clientY - 10);
        };

        const handleHover = (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('a')) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener('mousemove', mouseMove);
        window.addEventListener('mouseover', handleHover);

        return () => {
            window.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('mouseover', handleHover);
        };
    }, [cursorX, cursorY]);

    if (!isVisible) return null;

    return (
        <>
            <style>
                {`
          body, button, a {
            cursor: none !important;
          }
        `}
            </style>
            <motion.div
                className="fixed top-0 left-0 w-5 h-5 border-2 border-[#d4af37] rounded-full pointer-events-none z-[99999]"
                style={{
                    x: cursorX,
                    y: cursorY,
                    scale: isHovering ? 2.5 : 1,
                    backgroundColor: isHovering ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                    transition: { scale: { type: 'spring', ...springConfig } }
                }}
            />
            <motion.div
                className="fixed top-0 left-0 w-1 h-1 bg-[#d4af37] rounded-full pointer-events-none z-[99999]"
                animate={{
                    x: mousePosition.x - 2,
                    y: mousePosition.y - 2,
                }}
                transition={{ type: 'tween', ease: 'linear', duration: 0 }}
            />
        </>
    );
};

export default CustomCursor;
