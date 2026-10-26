import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle } from 'lucide-react';

const Header = () => {
  const [nodeStatus, setNodeStatus] = useState({ network: '', block_height: 0, syncing: false });

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/node-status');
      // Map Bitcoin Core fields to UI state
      const { chain, blocks, initialblockdownload } = res.data;
      setNodeStatus({
        network: chain,
        block_height: blocks,
        syncing: initialblockdownload,
      });
    } catch (e) {
      console.error('Node status fetch error', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, []);

  const { network, block_height, syncing } = nodeStatus;
  const StatusIcon = syncing ? XCircle : CheckCircle;

  return (
    <header className="p-4 bg-gray-800 text-white flex justify-between items-center">
      <div className="text-xl font-bold">Cold Wallet Watch‑Only</div>
      <div className="flex space-x-4 items-center">
        <span>Network: {network || '—'}</span>
        <span>Block Height: {block_height || '—'}</span>
        <span className="flex items-center">
          Status <StatusIcon className="ml-1" size={18} />
        </span>
      </div>
    </header>
  );
};

export default Header;
