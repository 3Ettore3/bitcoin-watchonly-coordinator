import React, { useState } from 'react';
import axios from 'axios';

const ImportWallet = () => {
  const [walletName, setWalletName] = useState('');
  const [xpub, setXpub] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/wallet/import-xpub', {
        name: walletName,
        descriptor_or_xpub: xpub,
      });
      const { wallet_id } = res.data;
      // Persist wallet ID for later use
      localStorage.setItem('wallet_id', wallet_id);
      setMessage(`Wallet imported successfully (ID: ${wallet_id})`);
    } catch (err) {
      console.error(err);
      setMessage('Error importing wallet');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <h2 className="text-2xl mb-4">Import Watch‑Only Wallet</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Wallet Name</label>
          <input
            type="text"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            className="w-full border p-2"
            required
          />
        </div>
        <div>
          <label className="block mb-1">Extended Public Key (xpub)</label>
          <textarea
            value={xpub}
            onChange={(e) => setXpub(e.target.value)}
            className="w-full border p-2"
            rows={3}
            required
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2">
          Import
        </button>
      </form>
      {message && <p className="mt-4">{message}</p>}
    </div>
  );
};

export default ImportWallet;
