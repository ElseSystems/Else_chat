'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

type QR = { id: string; title: string; body: string };

export default function QuickRepliesPage() {
  const [items, setItems] = useState<QR[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function load() {
    setItems(await api<QR[]>('/quick-replies'));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api('/quick-replies', {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    });
    setTitle('');
    setBody('');
    await load();
  }

  return (
    <AppShell title="Respostas rápidas">
      <div className="page">
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, marginBottom: 24, maxWidth: 560 }}>
          <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea
            placeholder="Mensagem"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={3}
          />
          <button className="btn" type="submit">
            Criar
          </button>
        </form>
        <table className="table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Mensagem</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.title}</td>
                <td>{i.body}</td>
                <td>
                  <button
                    className="btn danger"
                    onClick={async () => {
                      await api(`/quick-replies/${i.id}`, { method: 'DELETE' });
                      await load();
                    }}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
