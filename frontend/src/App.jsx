import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Header from './components/Header';
import ImportWallet from './components/ImportWallet';
import BalanceDashboard from './components/BalanceDashboard';
import Receive from './components/Receive';
import Send from './components/Send';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <Header />

        {/* Navigation bar */}
        <nav className="bg-gray-700 text-white p-2">
          <ul className="flex space-x-4">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/import">Import Wallet</Link>
            </li>
            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link to="/receive">Receive</Link>
            </li>
            <li>
              <Link to="/send">Send</Link>
            </li>
          </ul>
        </nav>

        {/* Main content area */}
        <main className="flex-1 p-4">
          <Routes>
            <Route
              path="/"
              element={
                <div className="text-center mt-8">
                  <h1 className="text-2xl">Welcome to Cold Wallet Watch‑Only</h1>
                </div>
              }
            />
            <Route path="/import" element={<ImportWallet />} />
            <Route path="/dashboard" element={<BalanceDashboard />} />
            <Route path="/receive" element={<Receive />} />
            <Route path="/send" element={<Send />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
