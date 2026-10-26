import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BalanceDashboard = () => {
  const [totalBtc, setTotalBtc] = useState(0);
  const [totalSats, setTotalSats] = useState(0);
  const [utxos, setUtxos] = useState([]);

  useEffect(() => {
    const fetchUtxos = async () => {
      try {
        const res = await axios.get('/api/wallet/utxos');
        const data = res.data;
        setTotalBtc(data.total_balance_btc || 0);
        setTotalSats(data.total_balance_sats || 0);
        setUtxos(data.utxos || []);
      } catch (e) {
        console.error('Failed to fetch UTXOs', e);
      }
    };
    fetchUtxos();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Balance Dashboard</h2>
      <div className="mb-4">
        <p>Total BTC: {totalBtc}</p>
        <p>Total Satoshis: {totalSats}</p>
      </div>
      <table className="min-w-full border">
        <thead className="bg-gray-200">
          <tr>
            <th className="border px-2 py-1">TxID</th>
            <th className="border px-2 py-1">Vout</th>
            <th className="border px-2 py-1">Amount (sats)</th>
            <th className="border px-2 py-1">Address</th>
            <th className="border px-2 py-1">Confirmations</th>
          </tr>
        </thead>
        <tbody>
          {utxos.map((u, idx) => (
            <tr key={idx} className={idx % 2 ? 'bg-gray-50' : ''}>
              <td className="border px-2 py-1 break-all">{u.txid}</td>
              <td className="border px-2 py-1 text-center">{u.vout}</td>
              <td className="border px-2 py-1 text-right">{u.amount_sats}</td>
              <td className="border px-2 py-1 break-all">{u.address}</td>
              <td className="border px-2 py-1 text-center">{u.confirmations}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BalanceDashboard;
