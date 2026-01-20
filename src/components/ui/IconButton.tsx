import { forwardRef, ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 
    children, 
    variant = 'default', 
    size = 'md', 
    className = '',
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';
    
    const variants = {
      default: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-400 dark:hover:bg-gray-800',
      ghost: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:ring-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800',
      danger: 'text-gray-600 hover:text-red-600 hover:bg-red-50 focus:ring-red-500 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20',
    };
    
    const sizes = {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-3',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;
