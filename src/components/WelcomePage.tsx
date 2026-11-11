import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

export const WelcomePage: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [sliderX, setSliderX] = useState(0);

  const handleDrag = (_: any, info: any) => {
    const x = Math.max(0, Math.min(200, info.offset.x));
    setSliderX(x);
  };

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 150) {
      onComplete();
    } else {
      setSliderX(0);
    }
  };

  return (
    <motion.div
      initial={{ y: '-100%' }}
      animate={{ y: 0 }}
      exit={{ y: '-100%' }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center"
    >
      <h1 className="text-4xl font-black text-zinc-950 dark:text-zinc-50 mb-6">Welcome to<br/>Sonu Diesel Bhatti</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-12 max-w-sm">
        We provide high-quality industrial diesel bhatti solutions for all your catering and commercial needs.
      </p>

      <div className="relative w-64 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-full p-1 shadow-inner overflow-hidden">
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 200 }}
          dragElastic={0}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={{ x: sliderX }}
          className="w-12 h-12 bg-zinc-950 dark:bg-zinc-100 rounded-full flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing"
        >
          <ChevronRight className="text-white dark:text-zinc-950 w-6 h-6" />
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-zinc-400 pointer-events-none">
          Slide to get started
        </div>
      </div>
    </motion.div>
  );
};
