import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-retail-text mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-retail-muted">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`
            w-full rounded-lg text-sm bg-white border transition-colors duration-150
            placeholder:text-retail-muted/70 text-retail-text
            ${leftIcon ? 'pl-9' : 'pl-3.5'}
            ${rightIcon ? 'pr-9' : 'pr-3.5'}
            py-2
            ${error 
              ? 'border-retail-error focus:border-retail-error focus:ring-2 focus:ring-retail-error/20' 
              : 'border-retail-border focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20'}
            disabled:bg-retail-bg disabled:text-retail-muted disabled:cursor-not-allowed
            focus:outline-none
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-retail-muted">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-retail-error font-medium">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-retail-muted">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
