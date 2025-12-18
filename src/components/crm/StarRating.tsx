import { useState } from 'react';
import { Star, Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StarRatingProps {
  averageRating: number | null;
  userRating: number | null;
  totalRatings: number;
  onRatingChange: (rating: number) => void;
}

export function StarRating({ averageRating, userRating, totalRatings, onRatingChange }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // For display: use hover, then user's rating, then average
  const displayRating = hoverRating ?? userRating ?? averageRating ?? 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
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
            {totalRatings > 0 && (
              <span className="text-xs text-muted-foreground mr-1 flex items-center gap-0.5">
                <Users className="h-3 w-3" />
                {totalRatings}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" dir="rtl">
          <div className="text-sm">
            <div>ממוצע: {averageRating?.toFixed(1) || '—'}</div>
            <div>הדירוג שלך: {userRating || 'לא דורג'}</div>
            <div>{totalRatings} מדרגים</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
