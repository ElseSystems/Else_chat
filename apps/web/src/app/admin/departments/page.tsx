'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

type Dept = { id: string; name: string };

export default function DepartmentsPage() {
  const [items, setItems] = useState<Dept[]>([]);
  const [name, setName] = useState('');

  async function load() {
    setItems(await api<Dept[]>('/departments'));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api('/departments', { method: 'POST', body: JSON.stringify({ name }) });
    setName('');
    await load();
  }

  return (
    <AppShell title="Setores">
      <div className="page">
        <form onSubmit={onSubmit} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <input
            placeholder="Nome do setor"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button className="btn" type="submit">
            Criar
          </button>
        </form>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>
                  <button
                    className="btn danger"
                    onClick={async () => {
                      await api(`/departments/${d.id}`, { method: 'DELETE' });
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
