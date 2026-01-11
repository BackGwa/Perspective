import { CLIENT_COUNT } from '../../config/uiText';
import '../../../styles/components/client-count-badge.scss';

interface ClientCountBadgeProps {
  participantCount: number;
}

export function ClientCountBadge({ participantCount }: ClientCountBadgeProps) {
  return (
    <div className="client-count-badge">
      <span className="client-count-badge__count">{participantCount}</span>
      <span className="client-count-badge__label">{CLIENT_COUNT.CONNECTED}</span>
    </div>
  );
}
