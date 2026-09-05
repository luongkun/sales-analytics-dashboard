import { useEffect, useRef, useState, ReactNode, HTMLAttributes } from 'react';

interface AnimatedSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  delay?: number;
}

const AnimatedSection = ({ children, delay = 0, className, style, ...rest }: AnimatedSectionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const currentRef = domRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={className}
      style={{
        ...style,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(36px) scale(0.97)',
        filter: isVisible ? 'blur(0)' : 'blur(6px)',
        transition: `opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, filter 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;