'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

type Metrics = { waiting: number; assigned: number; resolvedToday: number };

export default function MetricsPage() {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    api<Metrics>('/conversations/metrics').then(setM).catch(console.error);
  }, []);

  return (
    <AppShell title="Métricas">
      <div className="page">
        <div className="cards">
          <div className="card">
            <div className="meta" style={{ color: 'var(--muted)' }}>
              Aguardando
            </div>
            <div className="value">{m?.waiting ?? '—'}</div>
          </div>
          <div className="card">
            <div className="meta" style={{ color: 'var(--muted)' }}>
              Em atendimento
            </div>
            <div className="value">{m?.assigned ?? '—'}</div>
          </div>
          <div className="card">
            <div className="meta" style={{ color: 'var(--muted)' }}>
              Resolvidas hoje
            </div>
            <div className="value">{m?.resolvedToday ?? '—'}</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
