import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = () => {
    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: '#0a0a0a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="serif"
                style={{
                    fontSize: '3rem',
                    color: '#d4af37',
                    letterSpacing: '0.2rem',
                    marginBottom: '2rem'
                }}
            >
                DCUKUR
            </motion.div>

            <div style={{ width: '200px', height: '2px', background: '#1f1f1f', position: 'relative' }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    style={{
                        height: '100%',
                        background: '#d4af37',
                        boxShadow: '0 0 10px #d4af37'
                    }}
                />
            </div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                style={{ marginTop: '1rem', color: '#a1a1a1', fontSize: '0.75rem', letterSpacing: '0.1rem' }}
            >
                FORGING YOUR STYLE
            </motion.p>
        </motion.div>
    );
};

export default LoadingScreen;
