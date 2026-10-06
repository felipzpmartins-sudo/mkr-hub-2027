import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import slide1 from "@/assets/carousel/slide-1.jpg";
import slide2 from "@/assets/carousel/slide-2.jpg";
import slide3 from "@/assets/carousel/slide-3.jpg";
import slide4 from "@/assets/carousel/slide-4.jpg";
import slide5 from "@/assets/carousel/slide-5.jpg";

const images = [slide1, slide2, slide3, slide4, slide5];

const ImageCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img
            src={images[currentIndex]}
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Dark overlay for better contrast */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-background/30 to-background" />
        </motion.div>
      </AnimatePresence>

      {/* Progress indicators */}
      <div className="absolute bottom-8 right-8 flex gap-2 z-10">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1 transition-all duration-500 ${
              idx === currentIndex 
                ? "w-8 bg-foreground" 
                : "w-2 bg-foreground/30 hover:bg-foreground/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
