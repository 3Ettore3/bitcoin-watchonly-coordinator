import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';


const QRScanner = ({ onScan, onCancel }) => {
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (!scanning) return;
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    };
    const qrCodeSuccess = (decodedText, decodedResult) => {
      // Stop scanning and report result
      html5QrCodeRef.current.stop().then(() => {
        setScanning(false);
        onScan(decodedText);
      }).catch(console.error);
    };
    const qrCodeError = (errorMessage) => {
      // ignore errors (quiet scanning)
    };
    html5QrCodeRef.current = new Html5Qrcode(scannerRef.current.id);
    html5QrCodeRef.current.start({ facingMode: 'environment' }, config, qrCodeSuccess, qrCodeError)
      .catch(err => {
        console.error('Failed to start QR scanner', err);
        setScanning(false);
      });
    // Cleanup on unmount
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [scanning, onScan]);

  const handleCancel = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(() => {});
    }
    setScanning(false);
    onCancel && onCancel();
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Scan Signed PSBT</h3>
      {scanning ? (
        <div>
          <div id="qr-scanner" ref={scannerRef} style={{ width: '300px' }} />
          <button
            onClick={handleCancel}
            className="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <p>Scanner stopped.</p>
      )}
    </div>
  );
};

export default QRScanner;
