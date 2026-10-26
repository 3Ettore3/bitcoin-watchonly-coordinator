import React, { useState } from 'react';
import axios from 'axios';
import QRDisplay from './QRDisplay';
import QRScanner from './QRScanner';
import Toast from './Toast';
import LoadingSpinner from './LoadingSpinner';


const Send = () => {
  // Form fields
  const [targetAddress, setTargetAddress] = useState('');
  const [amountBtc, setAmountBtc] = useState('');
  const [feeRate, setFeeRate] = useState('2');
  const [changeAddress, setChangeAddress] = useState('');

  // PSBT creation state
  const [psbtResult, setPsbtResult] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Scanner / manual entry state
  const [showScanner, setShowScanner] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [signedPsbt, setSignedPsbt] = useState('');

  // Broadcast state
  const [broadcastResult, setBroadcastResult] = useState(null);
  const [broadcastError, setBroadcastError] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message: msg, type }]);
  };
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  //Create using PSBT
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setPsbtResult(null);
    setBroadcastResult(null);
    setBroadcastError(null);
    setSignedPsbt('');
    setManualMode(false);
    setIsCreating(true);
    try {
      const payload = {
        target_address: targetAddress,
        amount_btc: parseFloat(amountBtc),
        fee_rate: parseInt(feeRate, 10),
      };
      if (changeAddress) payload.change_address = changeAddress;
      const res = await axios.post('/api/tx/create-psbt', payload);
      setPsbtResult(res.data);
      addToast('PSBT created successfully', 'success');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || 'Failed to create PSBT';
      setCreateError(msg);
      addToast(msg, 'error');
    } finally {
      setIsCreating(false);
    }
  };

//Broadcast using PSBT
  const broadcastSigned = async (signed) => {
    if (!psbtResult?.draft_id) {
      const msg = 'Missing draft_id – cannot broadcast.';
      setBroadcastError(msg);
      addToast(msg, 'error');
      return;
    }
    setIsBroadcasting(true);
    try {
      const res = await axios.post('/api/tx/broadcast', {
        signed_psbt: signed,
        draft_id: psbtResult.draft_id,
      });
      setBroadcastResult(res.data);
      setBroadcastError(null);
      addToast('Transaction broadcasted', 'success');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || 'Broadcast failed';
      setBroadcastError(msg);
      addToast(msg, 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Handlers for scanner & manual entry
  const handleScan = (data) => {
    setSignedPsbt(data);
    setShowScanner(false);
    broadcastSigned(data);
  };

  const handleCancelScan = () => setShowScanner(false);

  const handleManualBroadcast = () => {
    if (!signedPsbt) {
      const msg = 'Please paste the signed PSBT before broadcasting.';
      setBroadcastError(msg);
      addToast(msg, 'error');
      return;
    }
    broadcastSigned(signedPsbt);
  };

  // Copy helpers    
  const copyToClipboard = (text, label = 'Copied') => {
    navigator.clipboard.writeText(text).then(() => addToast(`${label} to clipboard`, 'success'));
  };

  // Render UI    
  return (
    <div className="p-4 relative">
      <h2 className="text-xl font-bold mb-4">Create PSBT</h2>

      {/* Form */}
      <form onSubmit={handleCreate} className="space-y-4 max-w-md">
        <div>
          <label className="block">Target Address</label>
          <input
            type="text"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            required
            className="border p-1 w-full"
          />
        </div>
        <div>
          <label className="block">Amount (BTC)</label>
          <input
            type="number"
            step="any"
            value={amountBtc}
            onChange={(e) => setAmountBtc(e.target.value)}
            required
            className="border p-1 w-full"
          />
        </div>
        <div>
          <label className="block">Fee Rate (sat/vB)</label>
          <input
            type="number"
            value={feeRate}
            onChange={(e) => setFeeRate(e.target.value)}
            className="border p-1 w-full"
          />
        </div>
        <div>
          <label className="block">Change Address (optional)</label>
          <input
            type="text"
            value={changeAddress}
            onChange={(e) => setChangeAddress(e.target.value)}
            className="border p-1 w-full"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 flex items-center"
          disabled={isCreating}
        >
          {isCreating && <LoadingSpinner size="sm" className="mr-2" />}
          Create PSBT
        </button>
      </form>

      {/* Errors */}
      {createError && <p className="mt-4 text-red-600">Error: {createError}</p>}

      {/* PSBT Result */}
      {psbtResult && (
        <div className="mt-6">
          <p>Draft ID: {psbtResult.draft_id || psbtResult.id || 'N/A'}</p>
          <p className="flex items-center">
            PSBT (Base64):
            <button
              onClick={() => copyToClipboard(psbtResult.psbt_base64, 'PSBT')}
              className="ml-2 text-sm text-blue-600 underline"
            >
              Copy
            </button>
          </p>
          <textarea
            readOnly
            value={psbtResult.psbt_base64}
            rows={4}
            className="w-full border p-1"
          />
          <div className="mt-2">
            <QRDisplay value={psbtResult.psbt_base64} />
          </div>
          <div className="mt-4 space-x-2">
            <button
              onClick={() => setShowScanner(true)}
              className="bg-green-500 text-white px-3 py-1"
            >
              Scan Signed PSBT
            </button>
            <button
              onClick={() => setManualMode(true)}
              className="bg-gray-600 text-white px-3 py-1"
            >
              Manual Entry
            </button>
          </div>
        </div>
      )}

      {/* QR Scanner UI */}
      {showScanner && (
        <div className="mt-4">
          <QRScanner onScan={handleScan} onCancel={handleCancelScan} />
        </div>
      )}

      {/* Manual entry UI */}
      {manualMode && (
        <div className="mt-4">
          <label className="block mb-1">Paste Signed PSBT (Base64)</label>
          <textarea
            value={signedPsbt}
            onChange={(e) => setSignedPsbt(e.target.value)}
            rows={4}
            className="w-full border p-1"
            placeholder="Signed PSBT..."
          />
          <div className="mt-2 space-x-2">
            <button
              onClick={handleManualBroadcast}
              className="bg-blue-500 text-white px-3 py-1 flex items-center"
              disabled={isBroadcasting}
            >
              {isBroadcasting && <LoadingSpinner size="xs" className="mr-1" />}
              Broadcast
            </button>
            <button
              onClick={() => setManualMode(false)}
              className="bg-gray-300 px-3 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Broadcast Result */}
      {broadcastResult && (
        <div className="mt-4 p-2 bg-green-100 border border-green-400">
          <p className="font-medium">Transaction Broadcasted!</p>
          <p>TXID: {broadcastResult.txid || broadcastResult.txid_hex}</p>
        </div>
      )}
      {broadcastError && <p className="mt-4 text-red-600">Broadcast error: {broadcastError}</p>}

      {/* Toasts */}
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
};

export default Send;
