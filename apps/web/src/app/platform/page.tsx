'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  _count?: { users: number; instances: number };
};

export default function PlatformPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    plan: 'starter',
  });
  const [error, setError] = useState('');

  async function load() {
    setTenants(await api<Tenant[]>('/tenants'));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/tenants', { method: 'POST', body: JSON.stringify(form) });
      setForm({
        name: '',
        slug: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        plan: 'starter',
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AppShell title="Plataforma — Tenants">
      <div className="page">
        <form
          onSubmit={onSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 32,
          }}
        >
          {error ? <div className="error" style={{ gridColumn: '1 / -1' }}>{error}</div> : null}
          <input
            placeholder="Empresa"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
          />
          <input
            placeholder="Admin nome"
            value={form.adminName}
            onChange={(e) => setForm({ ...form, adminName: e.target.value })}
            required
          />
          <input
            placeholder="Admin e-mail"
            type="email"
            value={form.adminEmail}
            onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
            required
          />
          <input
            placeholder="Admin senha"
            type="password"
            value={form.adminPassword}
            onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
            required
          />
          <select
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
          >
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <button className="btn" type="submit">
            Criar tenant
          </button>
        </form>

        <table className="table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Slug</th>
              <th>Plano</th>
              <th>Status</th>
              <th>Usuários</th>
              <th>Instâncias</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.slug}</td>
                <td>{t.plan}</td>
                <td>{t.status}</td>
                <td>{t._count?.users ?? '—'}</td>
                <td>{t._count?.instances ?? '—'}</td>
                <td>
                  <button
                    className="btn secondary"
                    onClick={async () => {
                      const status = t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
                      await api(`/tenants/${t.id}/status`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status }),
                      });
                      await load();
                    }}
                  >
                    {t.status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
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
