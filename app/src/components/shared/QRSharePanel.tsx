import { useEffect, useState } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import { QR_SHARE } from '../../config/uiText';
import { TIMING } from '../../config/timing';
import { QR_CODE_DESIGN } from '../../config/design';
import '../../../styles/components/qr-share-panel.scss';

interface QRSharePanelProps {
  shareLink: string;
}

type QRCodeSVGProps = {
  value: string;
  size?: number;
  style?: CSSProperties;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  bgColor?: string;
  fgColor?: string;
};

export function QRSharePanel({ shareLink }: QRSharePanelProps) {
  const [copied, setCopied] = useState(false);
  const [QRCodeSVG, setQRCodeSVG] = useState<ComponentType<QRCodeSVGProps> | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('qrcode.react')
      .then((module) => {
        if (isMounted) {
          setQRCodeSVG(() => module.QRCodeSVG);
        }
      })
      .catch((error) => {
        console.error('Failed to load QR code component:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), TIMING.COPY_FEEDBACK_DURATION);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };



  return (
    <div className="qr-share-panel">
      <div className="qr-share-panel__qr-container">
        {QRCodeSVG && (
          <QRCodeSVG
            value={shareLink}
            size={undefined}
            style={{ width: '100%', height: '100%' }}
            level={QR_CODE_DESIGN.ERROR_CORRECTION_LEVEL}
            includeMargin={false}
            bgColor={QR_CODE_DESIGN.BG_COLOR}
            fgColor={QR_CODE_DESIGN.FG_COLOR}
          />
        )}
      </div>

      <button
        className={`qr-share-panel__copy-button ${copied ? 'qr-share-panel__copy-button--copied' : ''}`}
        onClick={handleCopy}
      >
        {copied ? QR_SHARE.COPIED : QR_SHARE.COPY_LINK}
      </button>
    </div>
  );
}
