'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export function FadeIn({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
          observer.unobserve(el)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: 0, transform: 'translateY(12px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}
    >
      {children}
    </div>
  )
}
