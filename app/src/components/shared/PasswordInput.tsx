import { useState } from 'react';
import '../../../styles/components/password-input.scss';
import { IconEye } from '../icons/IconEye';
import { IconEyeOff } from '../icons/IconEyeOff';
import { PASSWORD_CONFIG, ERROR_MESSAGES } from '../../config/constants';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  onValidationError?: (message: string | null) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function PasswordInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Enter password',
  disabled = false,
  error = false,
  onValidationError,
  onFocus,
  onBlur
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [lengthError, setLengthError] = useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit && !disabled) {
      onSubmit();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleChange = (newValue: string) => {
    if (newValue.length > PASSWORD_CONFIG.MAX_LENGTH) {
      const message = ERROR_MESSAGES.PASSWORD_TOO_LONG;
      setLengthError(message);
      onValidationError?.(message);
      return;
    }

    if (newValue.length > 0 && newValue.length < PASSWORD_CONFIG.MIN_LENGTH) {
      const message = ERROR_MESSAGES.PASSWORD_TOO_SHORT;
      setLengthError(message);
      onValidationError?.(message);
    } else {
      setLengthError(null);
      onValidationError?.(null);
    }

    onChange(newValue);
  };

  return (
    <div className="password-input-container">
      <input
        type={showPassword ? 'text' : 'password'}
        className={`password-input ${error || lengthError ? 'password-input--error' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        maxLength={PASSWORD_CONFIG.MAX_LENGTH}
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
