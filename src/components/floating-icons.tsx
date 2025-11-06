'use client';

import React from 'react';
import {
  Apple,
  Cookie,
  CupSoda,
  Grape,
  Pizza,
  Salad,
  Sandwich,
  Utensils,
} from 'lucide-react';

const icons = [
  { icon: <Utensils /> },
  { icon: <Pizza /> },
  { icon: <Cookie /> },
  { icon: <Salad /> },
  { icon: <CupSoda /> },
  { icon: <Grape /> },
  { icon: <Apple /> },
  { icon: <Sandwich /> },
  { icon: <Utensils /> },
  { icon: <Pizza /> },
  { icon: <Cookie /> },
  { icon: <Salad /> },
];

export default function FloatingIcons() {
    const [iconPositions, setIconPositions] = React.useState<React.CSSProperties[]>([]);

    React.useEffect(() => {
        const positions = icons.map(() => ({
            top: `${Math.random() * 90}%`,
            left: `${Math.random() * 90}%`,
            transform: `scale(${Math.random() * 0.5 + 0.5})`,
            animation: `float ${Math.random() * 5 + 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`
        }));
        setIconPositions(positions);
    }, []);

    if (iconPositions.length === 0) {
        return null;
    }

  return (
    <div className="absolute inset-0 z-0 h-full w-full bg-background">
        <div className="absolute inset-0 bg-primary/10" />
        <ul className="h-full w-full">
            {icons.map((item, index) => (
            <li
                key={index}
                className="absolute text-primary/30"
                style={iconPositions[index]}
            >
                {React.cloneElement(item.icon, {
                    className: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
                })}
            </li>
            ))}
        </ul>
    </div>
  );
}
