"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function TextoMarquee({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [marquee, setMarquee] = useState(false);

  useEffect(() => {
    function check() {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;
      setMarquee(measure.scrollWidth > container.clientWidth + 1);
    }

    check();
    const observer = new ResizeObserver(check);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[34px] min-w-0 items-center overflow-hidden"
      title={text}
    >
      <span
        ref={measureRef}
        className={cn("pointer-events-none absolute whitespace-nowrap opacity-0", className)}
        aria-hidden
      >
        {text}
      </span>
      {marquee ? (
        <div className="meb-marquee-track flex w-max gap-8">
          <span className={cn("whitespace-nowrap text-sm", className)}>{text}</span>
          <span className={cn("whitespace-nowrap text-sm", className)} aria-hidden>
            {text}
          </span>
        </div>
      ) : (
        <span className={cn("truncate text-sm", className)}>{text}</span>
      )}
    </div>
  );
}
