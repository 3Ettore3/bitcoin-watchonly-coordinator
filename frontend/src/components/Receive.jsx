import React, { useEffect, useState } from 'react';
import QRDisplay from './QRDisplay';
import axios from 'axios';

const Receive = () => {
  const [address, setAddress] = useState('');

  useEffect(() => {
    // Placeholder: fetch first receive address from backend if available
    const fetchAddress = async () => {
      try {
        const res = await axios.get('/api/wallet/receive-address');
        setAddress(res.data.address);
      } catch (e) {
        // If API not implemented, use placeholder
        setAddress('bc1qplaceholderaddress1234567890');
      }
    };
    fetchAddress();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Receive</h2>
      <p className="mb-2 break-all">Address: {address || 'Loading...'}</p>
      <button onClick={copyToClipboard} className="mb-4 bg-gray-300 px-2 py-1">Copy</button>
      {address && <QRDisplay value={address} />}
    </div>
  );
};

export default Receive;
