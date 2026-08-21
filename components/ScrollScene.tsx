'use client';
import { useEffect, useRef, useState } from 'react';

export default function ScrollScene({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id={id} className={`scene${className ? ` ${className}` : ''}`}>
      <div ref={ref} className={`sceneInner${inView ? ' in-view' : ''}`}>{children}</div>
    </section>
  );
}
