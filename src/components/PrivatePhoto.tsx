import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';
import { cn } from '../lib/utils';

interface PrivatePhotoProps {
  imageUrl: string;
  isUnlocked: boolean;
  className?: string;
  alt?: string;
}

/**
 * A reusable component that displays a user image with a blurred "glass" overlay effect when the photo is locked.
 */
const PrivatePhoto: React.FC<PrivatePhotoProps> = ({ 
  imageUrl, 
  isUnlocked, 
  className,
  alt = "User photo"
}) => {
  return (
    <div className={cn("relative overflow-hidden group w-full h-full", className)}>
      {/* Background Image - Always loads normally in the background */}
      <motion.img
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        // Slight zoom effect on hover (desktop only)
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      {/* Glass Overlay - Frosted glass effect with backdrop-filter */}
      <AnimatePresence>
        {!isUnlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4"
          >
            {/* Darkened glass effect + subtle gradient dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 pointer-events-none" />
            
            {/* Frosted Glass Effect using backdrop-filter: blur() */}
            <div className="absolute inset-0 backdrop-blur-2xl pointer-events-none" />

            {/* Centered Lock Icon and Text */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-20 flex flex-col items-center gap-4 text-white"
            >
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                <Lock size={28} className="text-yellow-500 fill-yellow-500/20" />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight">Private Photo</span>
                <span className="text-[10px] uppercase font-black tracking-[0.25em] text-white/40">Locked</span>
              </div>
            </motion.div>
            
            {/* Premium iOS-style shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrivatePhoto;
