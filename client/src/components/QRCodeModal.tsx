import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Download, ExternalLink, Printer, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  menuTitle: string;
  restaurantName: string;
  slug: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  menuTitle,
  restaurantName,
  slug,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const publicUrl = `${window.location.origin}/m/${slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSVG = () => {
    if (!qrRef.current) return;
    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug}-qr-code.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-cream-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-charcoal-900">Digital Menu QR Code</h3>
              <p className="text-xs text-charcoal-500">Scan to view instant bilingual menu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-charcoal-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-5">
          {/* Table tent card mockup */}
          <div
            id="printable-qr-card"
            className="p-6 rounded-2xl border-2 border-stone-200 bg-gradient-to-b from-white to-stone-50 shadow-inner flex flex-col items-center max-w-xs mx-auto"
          >
            <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full mb-3">
              Scan & Dine
            </span>

            <h4 className="font-bold text-base text-charcoal-900 line-clamp-1">{restaurantName}</h4>
            <p className="text-xs text-charcoal-500 line-clamp-1 mb-4">{menuTitle}</p>

            <div
              ref={qrRef}
              className="p-4 bg-white rounded-xl shadow-sm border border-stone-200 inline-block"
            >
              <QRCodeSVG
                value={publicUrl}
                size={180}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=64&q=80',
                  x: undefined,
                  y: undefined,
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>

            <p className="mt-3 text-[11px] font-medium text-charcoal-600">
              English • اردو مینو
            </p>
            <p className="text-[10px] text-charcoal-400 mt-0.5">Powered by MenuMate AI</p>
          </div>

          {/* URL & Copy Link Bar */}
          <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-100 border border-stone-200">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="bg-transparent text-xs text-charcoal-700 font-mono flex-1 outline-none truncate px-1"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-charcoal-800 text-xs font-semibold hover:bg-stone-50 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-2">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-700 hover:text-emerald-700 font-semibold px-2 py-1.5 rounded-lg hover:bg-stone-200/60 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-emerald-600" />
            Open Menu
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSVG}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-charcoal-800 text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              SVG
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 active:scale-95 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Table Tent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
