import React, { useState } from 'react';
import { post } from '../api';

const sample = JSON.stringify([
  { name: 'Jordan', asks30d: 6, referrals90d: 1, thankYous90d: 0 },
  { name: 'Avery', asks30d: 2, referrals90d: 4, thankYous90d: 3 }
], null, 2);

export default function PartnerFatigue() {
  const [payload, setPayload] = useState(sample);
  const [result, setResult] = useState(null);

  async function run() {
    setResult(await post('/partner-fatigue/score', { partners: JSON.parse(payload) }));
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <h1 className="text-2xl font-bold">Referral Partner Fatigue</h1>
      <p className="text-slate-600">Balance asks, gratitude, and referral yield before contacting a partner again.</p>
      <textarea className="mt-4 h-64 w-full rounded border p-3 font-mono text-sm" value={payload} onChange={(event) => setPayload(event.target.value)} />
      <button className="mt-3 rounded bg-blue-600 px-4 py-2 text-white" onClick={run}>Score partners</button>
      {result && <div className="mt-4 space-y-3">{result.scored.map((row) => (
        <div key={row.name} className="border-b pb-3">
          <strong>{row.name}</strong>
          <div>Fatigue {row.fatigue}/100 | {row.action}</div>
        </div>
      ))}</div>}
    </div>
  );
}
