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
      setLengthError(ERROR_MESSAGES.PASSWORD_TOO_LONG);
      return;
    }

    if (newValue.length > 0 && newValue.length < PASSWORD_CONFIG.MIN_LENGTH) {
      setLengthError(ERROR_MESSAGES.PASSWORD_TOO_SHORT);
    } else {
      setLengthError(null);
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
      {lengthError && (
        <div className="password-input__error">
          {lengthError}
        </div>
      )}
    </div>
  );
}
