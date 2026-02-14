'use client'

import { useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("Frontend running");

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 800 }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0070f3' }}>AI Summary App</h1>
      <p>{status}</p>
      <p>Next: deploy this to Vercel, then add API routes.</p>
    </div>
  );
}
