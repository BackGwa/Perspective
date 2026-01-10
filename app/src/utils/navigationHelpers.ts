import type { NavigateFunction } from 'react-router-dom';

export function navigateWithError(
  navigate: NavigateFunction,
  errorMessage: string
): void {
  navigate('/', { state: { error: errorMessage } });
}
