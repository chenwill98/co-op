"use client";

import React, { useRef, useState, useEffect } from "react";
import { VideoCameraIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import Image from 'next/image';

export default function ImageCarousel({
  mediaItems,
}: {
  mediaItems: { type: string; url: string }[];
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  // Track which slide is currently active (for thumbnail highlighting).
  // We default to 1 (first slide) or you can choose 0 if you prefer.
  const [activeSlide, setActiveSlide] = useState(1);

  // Helper function to check if a URL is a PDF
  const isPDF = (url: string): boolean => {
    return url.toLowerCase().endsWith('.pdf');
  };

  // Effect to scroll the active thumbnail into view when it changes
  useEffect(() => {
    const thumbnailContainer = thumbnailContainerRef.current;
    if (!thumbnailContainer) return;
    
    const activeThumb = thumbnailContainer.querySelector(`[data-slide="${activeSlide}"]`) as HTMLElement;
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
    }
  }, [activeSlide]);

  // Handles all navigation (arrows and thumbnails)
  const goToSlide = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) => {
    event.preventDefault();
    const carousel = carouselRef.current;
    if (!carousel) return;

    const href = event.currentTarget.getAttribute("href");
    if (!href) return;

    // "#slide2" => extract numeric part to get the index
    const slideNumber = Number(href.replace("#slide", ""));
    if (isNaN(slideNumber)) return;

    // Smoothly scroll the carousel container to that slide
    const target = carousel.querySelector<HTMLDivElement>(href);
    if (!target) return;

    const left = target.offsetLeft;
    carousel.scrollTo({ left, behavior: "smooth" });

    // Update activeSlide so the correct thumbnail is highlighted
    setActiveSlide(slideNumber);
  };

  return (
    <div>
      {/* Carousel Container */}
      <div
        ref={carouselRef}
        className="carousel w-full aspect-[16/10] overflow-x-auto scroll-smooth relative rounded-md"
      >
        {mediaItems.map((item, index) => {
          // Use 1-indexed slide numbers for DaisyUI-style anchors
          const currentSlide = index + 1;
          const totalSlides = mediaItems.length;
          const prevSlide = currentSlide === 1 ? totalSlides : currentSlide - 1;
          const nextSlide = currentSlide === totalSlides ? 1 : currentSlide + 1;

          return (
            <div
              key={index}
              id={`slide${currentSlide}`}
              className="carousel-item relative w-full"
            >
              {item.type === "video" ? (
                <video controls className="w-full h-full object-cover">
                  <source src={item.url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : isPDF(item.url) ? (
                // For PDFs, render a clickable panel that opens the PDF
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <div className="flex items-center justify-center w-full h-full bg-base-200/60">
                    <span className="text-xl font-bold">
                      View Floorplan PDF
                    </span>
                  </div>
                </a>
              ) : (
                // Default case: treat as image
                <Image
                  src={item.url}
                  alt={`Image ${currentSlide}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 80vw"
                  priority={index === 0}
                  className="w-full h-full object-cover"
                />
              )}

              {/* DaisyUI-style Navigation Controls */}
              <div className="absolute left-3 right-3 top-1/2 flex -translate-y-1/2 transform justify-between">
                <a
                  href={`#slide${prevSlide}`}
                  className="btn btn-circle btn-ghost bg-base-100/60 hover:bg-base-100/80 backdrop-blur-sm shadow-md border-0"
                  onClick={goToSlide}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </a>
                <a
                  href={`#slide${nextSlide}`}
                  className="btn btn-circle btn-ghost bg-base-100/60 hover:bg-base-100/80 backdrop-blur-sm shadow-md border-0"
                  onClick={goToSlide}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Thumbnail Navigation */}
      <div ref={thumbnailContainerRef} className="flex flex-nowrap overflow-x-auto w-full scrollbar-hide justify-start">
        {mediaItems.map((item, index) => {
          // Also 1-indexed for matching
          const slideNumber = index + 1;

          return (
            <a
              key={index}
              onClick={goToSlide}
              href={`#slide${slideNumber}`}
              data-slide={slideNumber}
              // If this thumbnail corresponds to the active slide, apply a background highlight
              className={`shrink-0 cursor-pointer rounded-lg p-1 first:ml-0 last:mr-0
                ${
                  activeSlide === slideNumber
                    ? "bg-primary/20"
                    : "hover:bg-primary/20 transition-colors"
                }`}
            >
              {item.type === "video" ? (
                <div className="w-10 h-10 flex items-center justify-center bg-primary">
                  <VideoCameraIcon className="w-4 h-4 text-white" />
                </div>
              ) : isPDF(item.url) ? (
                <div className="w-10 h-10 flex items-center justify-center bg-primary">
                  <DocumentTextIcon className="w-4 h-4 text-white" />
                </div>
              ) : (
                <Image
                  src={item.url}
                  alt={`Thumbnail ${slideNumber}`}
                  width={60}
                  height={40}
                  className="w-15 h-10 object-cover rounded-sm"
                />
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
