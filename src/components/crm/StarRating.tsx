import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number | null;
  onRatingChange: (rating: number) => void;
}

export function StarRating({ rating, onRatingChange }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating ?? rating ?? 0;

  return (
    <div 
      className="flex items-center gap-1 justify-end"
      onMouseLeave={() => setHoverRating(null)}
    >
      {[5, 4, 3, 2, 1].map((star) => (
        <button
          key={star}
          onClick={() => onRatingChange(star)}
          onMouseEnter={() => setHoverRating(star)}
          className="p-0.5 hover:scale-125 transition-transform cursor-pointer"
          title={`דירוג ${star} מתוך 5`}
        >
          <Star
            className={`h-5 w-5 transition-colors ${
              star <= displayRating
                ? 'fill-yellow-500 text-yellow-500'
                : 'fill-gray-200 text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
