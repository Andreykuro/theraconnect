import { useState } from "react";
import { Star } from "lucide-react";

// Read-only row of filled/empty stars - para sa display ng grado.
export function StarRow({ value, size = 15, className = "" }) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= value ? "fill-sunrise text-sunrise" : "fill-transparent text-mist-light"}
        />
      ))}
    </div>
  );
}

// Clickable 1-5 star picker - therapist taps a star to grade the classwork.
export function StarPicker({ value, onChange, size = 22 }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className="rounded p-0.5 transition hover:scale-110"
        >
          <Star size={size} className={n <= display ? "fill-sunrise text-sunrise" : "fill-transparent text-mist-light"} />
        </button>
      ))}
    </div>
  );
}
