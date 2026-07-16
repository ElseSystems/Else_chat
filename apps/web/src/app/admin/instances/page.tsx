'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';
import { useSocket } from '@/lib/socket';

type Instance = {
  id: string;
  name: string;
  evolutionName: string;
  phoneNumber: string | null;
  status: string;
};

export default function InstancesPage() {
  const [items, setItems] = useState<Instance[]>([]);
  const [name, setName] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setItems(await api<Instance[]>('/instances'));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  useSocket({
    onInstance: () => load().catch(console.error),
    onQr: (data) => {
      if (data.id === selected && data.qrcode) {
        const src = String(data.qrcode).startsWith('data:')
          ? data.qrcode
          : `data:image/png;base64,${data.qrcode}`;
        setQr(src);
      }
    },
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setQr(null);
    try {
      const created = await api<Instance & { qrcode?: string | null }>('/instances', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setName('');
      await load();
      if (created?.id) {
        setSelected(created.id);
        if (created.qrcode) {
          const src = String(created.qrcode).startsWith('data:')
            ? created.qrcode
            : `data:image/png;base64,${created.qrcode}`;
          setQr(src);
        } else {
          await showQr(created.id);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function showQr(id: string) {
    setSelected(id);
    setError('');
    setQr(null);
    try {
      const res = await api<{ qrcode: string | null }>(`/instances/${id}/qr`);
      if (res.qrcode) {
        const src = String(res.qrcode).startsWith('data:')
          ? res.qrcode
          : `data:image/png;base64,${res.qrcode}`;
        setQr(src);
      } else {
        setError('QR ainda não disponível — remova a instância e crie novamente.');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AppShell title="Instâncias WhatsApp">
      <div className="page">
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Conecte um número via Evolution API. O QR Code sincroniza o WhatsApp do tenant.
        </p>
        <form onSubmit={onSubmit} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <input
            placeholder="Nome da instância"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button className="btn" type="submit">
            Criar & conectar
          </button>
        </form>
        {error ? <div className="error">{error}</div> : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Número</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>{i.status}</td>
                  <td>{i.phoneNumber || '—'}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="btn secondary" onClick={() => showQr(i.id)}>
                      QR Code
                    </button>
                    <button
                      className="btn secondary"
                      onClick={async () => {
                        await api(`/instances/${i.id}/status`);
                        await load();
                      }}
                    >
                      Atualizar
                    </button>
                    <button
                      className="btn danger"
                      onClick={async () => {
                        await api(`/instances/${i.id}`, { method: 'DELETE' });
                        await load();
                        if (selected === i.id) {
                          setSelected(null);
                          setQr(null);
                        }
                      }}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {qr ? (
            <div className="qr-box">
              <img src={qr} alt="QR Code WhatsApp" />
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
