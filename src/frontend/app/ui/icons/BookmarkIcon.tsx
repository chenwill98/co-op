import { useState } from 'react';
import { BookmarkIcon as BookmarkOutlineIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

export default function BookmarkIcon() {
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="w-6 h-6 text-primary cursor-pointer hover:text-primary-focus active:scale-90 transition"
            onClick={() => setIsBookmarked(!isBookmarked)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isBookmarked || isHovered ? (
                <BookmarkSolidIcon className="w-6 h-6" />
            ) : (
                <BookmarkOutlineIcon className="w-6 h-6" />
            )}
        </div>
    );
}