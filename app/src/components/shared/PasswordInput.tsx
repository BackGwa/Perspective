import { useState } from 'react';
import '../../../styles/components/password-input.scss';
import { IconEye } from '../icons/IconEye';
import { IconEyeOff } from '../icons/IconEyeOff';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

export function PasswordInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Enter password',
  disabled = false,
  error = false
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit && !disabled) {
      onSubmit();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <div className="password-input-container">
      <input
        type={showPassword ? 'text' : 'password'}
        className={`password-input ${error ? 'password-input--error' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button
        type="button"
        className="password-input__toggle"
        onClick={togglePasswordVisibility}
        disabled={disabled}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <IconEyeOff className="password-input__toggle-icon" />
        ) : (
          <IconEye className="password-input__toggle-icon" />
        )}
      </button>
    </div>
  );
}
