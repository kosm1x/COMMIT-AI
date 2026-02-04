import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    children, 
    variant = 'default', 
    padding = 'md',
    interactive = false,
    className = '',
    ...props 
  }, ref) => {
    const baseStyles = 'rounded-2xl transition-all duration-200';
    
    const variants = {
      default: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
      elevated: 'bg-white dark:bg-gray-900 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
      outlined: 'bg-transparent border-2 border-gray-200 dark:border-gray-700',
    };
    
    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    const interactiveStyles = interactive 
      ? 'cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 active:scale-[0.99]' 
      : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${interactiveStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
