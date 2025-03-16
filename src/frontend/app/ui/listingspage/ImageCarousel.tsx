"use client";

import React, { useRef, useState } from "react";
import { VideoCameraIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export default function ImageCarousel({
  mediaItems,
}: {
  mediaItems: { type: string; url: string }[];
}) {
  const carouselRef = useRef<HTMLDivElement>(null);

  // Track which slide is currently active (for thumbnail highlighting).
  // We default to 1 (first slide) or you can choose 0 if you prefer.
  const [activeSlide, setActiveSlide] = useState(1);

  // Helper function to check if a URL is a PDF
  const isPDF = (url: string): boolean => {
    return url.toLowerCase().endsWith('.pdf');
  };

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
        className="carousel w-full aspect-[16/10] overflow-x-auto scroll-smooth relative outline outline-1 outline-primary"
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
                  <div className="flex items-center justify-center w-full h-full bg-gray-200">
                    <span className="text-xl font-bold">
                      View Floorplan PDF
                    </span>
                  </div>
                </a>
              ) : (
                // Default case: treat as image
                <img
                  src={item.url}
                  alt={`Image ${currentSlide}`}
                  className="w-full h-full object-cover"
                />
              )}

              {/* DaisyUI-style Navigation Controls */}
              <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
                <a
                  href={`#slide${prevSlide}`}
                  className="btn btn-circle"
                  onClick={goToSlide}
                >
                  ❮
                </a>
                <a
                  href={`#slide${nextSlide}`}
                  className="btn btn-circle"
                  onClick={goToSlide}
                >
                  ❯
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Thumbnail Navigation */}
      <div className="flex flex-nowrap gap-2 overflow-x-auto w-full scrollbar-hide justify-center py-1">
        {mediaItems.map((item, index) => {
          // Also 1-indexed for matching
          const slideNumber = index + 1;

          return (
            <a
              key={index}
              onClick={goToSlide}
              href={`#slide${slideNumber}`}
              // If this thumbnail corresponds to the active slide, apply a ring outline
              className={`shrink-0 border border-primary cursor-pointer 
                ${
                  activeSlide === slideNumber
                    ? "ring-1 ring-primary ring-offset-2"
                    : ""
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
                <img
                  src={item.url}
                  alt={`Thumbnail ${slideNumber}`}
                  className="w-15 h-10 object-cover"
                />
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
