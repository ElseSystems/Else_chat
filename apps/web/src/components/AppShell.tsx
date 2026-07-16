'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getUser } from '@/lib/api';
import { useEffect, useState } from 'react';

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUser(u);
  }, [router]);

  if (!user) return null;

  const isSuper = user.role === 'SUPERADMIN';
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERVISOR';

  const links = isSuper
    ? [{ href: '/platform', label: 'Tenants' }]
    : [
        { href: '/inbox', label: 'Inbox' },
        ...(isAdmin
          ? [
              { href: '/admin/users', label: 'Usuários' },
              { href: '/admin/departments', label: 'Setores' },
              { href: '/admin/instances', label: 'WhatsApp' },
              { href: '/admin/quick-replies', label: 'Respostas' },
              { href: '/admin/metrics', label: 'Métricas' },
            ]
          : []),
      ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Else Chat</div>
        <nav className="nav">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname.startsWith(l.href) ? 'active' : ''}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="user-chip">
          <strong>{user.name}</strong>
          <span>
            {user.role}
            {user.tenant ? ` · ${user.tenant.name}` : ''}
          </span>
          <button
            className="btn secondary"
            style={{ marginTop: '0.75rem', width: '100%' }}
            onClick={() => {
              clearSession();
              router.push('/login');
            }}
          >
            Sair
          </button>
        </div>
      </aside>
      <div className="main">
        {title ? (
          <div className="topbar">
            <h2 style={{ margin: 0, fontFamily: 'var(--display)' }}>{title}</h2>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
