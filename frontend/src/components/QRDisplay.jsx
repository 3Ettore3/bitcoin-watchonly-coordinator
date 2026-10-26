import React from 'react';
import { QRCodeSVG } from 'qrcode.react';


const QRDisplay = ({ value, size = 256 }) => {
  if (!value) return null;
  return (
    <div className="flex justify-center my-4">
      <QRCodeSVG value={value} size={size} includeMargin={true} />
    </div>
  );
};

export default QRDisplay;
