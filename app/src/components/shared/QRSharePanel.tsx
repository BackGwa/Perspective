import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './QRSharePanel.scss';

interface QRSharePanelProps {
  shareLink: string;
}

export function QRSharePanel({ shareLink }: QRSharePanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };



  return (
    <div className="qr-share-panel">
      <div className="qr-share-panel__qr-container">
        <QRCodeSVG
          value={shareLink}
          size={undefined} // Let CSS control size
          style={{ width: '100%', height: '100%' }}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      <button
        className={`qr-share-panel__copy-button ${copied ? 'qr-share-panel__copy-button--copied' : ''}`}
        onClick={handleCopy}
      >
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  );
}
