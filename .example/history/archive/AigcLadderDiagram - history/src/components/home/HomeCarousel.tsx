"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface CarouselSlide {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  href?: string;
  external?: boolean;
  overlayTitle?: string;
  overlaySubtitle?: string;
  imageClassName?: string;
}

interface HomeCarouselProps {
  slides: CarouselSlide[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
}

export function HomeCarousel({
  slides,
  autoPlay = true,
  autoPlayInterval = 5000,
  className = "",
}: HomeCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  const goToNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % slides.length;
    goToSlide(nextIndex);
  }, [currentIndex, slides.length, goToSlide]);

  const goToPrev = useCallback(() => {
    const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
    goToSlide(prevIndex);
  }, [currentIndex, slides.length, goToSlide]);

  // Auto-play
  useEffect(() => {
    if (!autoPlay || isPaused || slides.length <= 1) return;

    const timer = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(timer);
  }, [autoPlay, isPaused, autoPlayInterval, goToNext, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev]);

  if (slides.length === 0) return null;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl shadow-lg ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        aspectRatio: "16/9",
        minHeight: "280px",
      }}
    >
      {/* Slides */}
      <div className="relative h-full w-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-500 ease-out ${
              index === currentIndex
                ? "opacity-100 scale-100"
                : "opacity-0 scale-105"
            }`}
          >
            {slide.href ? (
              slide.external ? (
                <a
                  href={slide.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full w-full cursor-pointer"
                >
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    className={`h-full w-full object-contain bg-slate-100 ${slide.imageClassName ?? ""}`}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </a>
              ) : (
                <Link href={slide.href} className="block h-full w-full cursor-pointer">
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    className={`h-full w-full object-contain bg-slate-100 ${slide.imageClassName ?? ""}`}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </Link>
              )
            ) : (
              <img
                src={slide.src}
                alt={slide.alt}
                className={`h-full w-full object-contain bg-slate-100 ${slide.imageClassName ?? ""}`}
                loading={index === 0 ? "eager" : "lazy"}
              />
            )}
            {/* Gradient overlay for better text readability if needed */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

            {(slide.overlayTitle || slide.overlaySubtitle) && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flex mx-auto max-w-[1600px] flex-col items-center gap-1 rounded-full bg-black/35 px-6 py-2.5 text-center text-white shadow-sm backdrop-blur-sm">
                  {slide.overlayTitle && (
                    <div className="text-base font-semibold tracking-tight sm:text-lg">
                      {slide.overlayTitle}
                    </div>
                  )}
                  {slide.overlaySubtitle && (
                    <div className="text-xs text-white/90 sm:text-sm">
                      {slide.overlaySubtitle}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition-all hover:bg-white hover:scale-110 active:scale-95"
            aria-label="上一张"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition-all hover:bg-white hover:scale-110 active:scale-95"
            aria-label="下一张"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 bg-white shadow-md"
                  : "w-2 bg-white/60 hover:bg-white/80"
              }`}
              aria-label={`跳转到第 ${index + 1} 张`}
            />
          ))}
        </div>
      )}

      {/* Progress bar for auto-play */}
      {autoPlay && !isPaused && slides.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
          <div
            className="h-full bg-white/80 transition-all ease-linear"
            style={{
              width: "100%",
              animation: `progress ${autoPlayInterval}ms linear infinite`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
