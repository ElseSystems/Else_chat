'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, getUser, mediaUrl } from '@/lib/api';
import { useSocket } from '@/lib/socket';

type Conversation = {
  id: string;
  status: string;
  assignedToId: string | null;
  lastMessageAt: string;
  contact: { name: string | null; phone: string };
  assignedTo?: { id: string; name: string } | null;
  messages?: { body: string | null; type: string }[];
};

type Message = {
  id: string;
  type: string;
  direction: string;
  body: string | null;
  mediaUrl: string | null;
  mediaFileName: string | null;
  createdAt: string;
};

type Agent = { id: string; name: string; role: string };
type QuickReply = { id: string; title: string; body: string };

export default function InboxPage() {
  const user = typeof window !== 'undefined' ? getUser() : null;
  const canSeeAll =
    user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  const [tab, setTab] = useState<'waiting' | 'mine' | 'all'>('waiting');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [text, setText] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [transferTo, setTransferTo] = useState('');
  const [note, setNote] = useState('');
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const data = await api<Conversation[]>(`/conversations?tab=${tab}`);
    setConversations(data);
  }, [tab]);

  const loadMessages = useCallback(async (id: string) => {
    const [detail, msgs] = await Promise.all([
      api<Conversation>(`/conversations/${id}`),
      api<Message[]>(`/conversations/${id}/messages`),
    ]);
    setSelected(detail);
    setMessages(msgs);
  }, []);

  useEffect(() => {
    loadConversations().catch(console.error);
  }, [loadConversations]);

  useEffect(() => {
    api<Agent[]>('/users/agents').then(setAgents).catch(() => undefined);
    api<QuickReply[]>('/quick-replies').then(setQuickReplies).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId).catch(console.error);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useSocket({
    onMessage: (data) => {
      if (data.conversationId === selectedId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
      loadConversations().catch(console.error);
    },
    onConversation: () => {
      loadConversations().catch(console.error);
      if (selectedId) loadMessages(selectedId).catch(console.error);
    },
  });

  async function claim() {
    if (!selectedId) return;
    await api(`/conversations/${selectedId}/claim`, { method: 'POST' });
    setTab('mine');
    await loadConversations();
    await loadMessages(selectedId);
  }

  async function resolve() {
    if (!selectedId) return;
    await api(`/conversations/${selectedId}/resolve`, { method: 'POST' });
    setSelectedId(null);
    setSelected(null);
    setMessages([]);
    await loadConversations();
  }

  async function transfer() {
    if (!selectedId || !transferTo) return;
    await api(`/conversations/${selectedId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ toUserId: transferTo }),
    });
    setTransferTo('');
    await loadConversations();
    await loadMessages(selectedId);
  }

  async function sendText() {
    if (!selectedId || !text.trim()) return;
    const body = text.trim();
    setText('');
    const msg = await api<Message>(`/conversations/${selectedId}/messages/text`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    setMessages((prev) => [...prev, msg]);
    await loadConversations();
  }

  async function sendFile(file: File, caption?: string) {
    if (!selectedId) return;
    const form = new FormData();
    form.append('file', file);
    if (caption) form.append('caption', caption);
    const msg = await api<Message>(
      `/conversations/${selectedId}/messages/media`,
      { method: 'POST', body: form },
    );
    setMessages((prev) => [...prev, msg]);
    await loadConversations();
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], `audio-${Date.now()}.webm`, {
        type: 'audio/webm',
      });
      stream.getTracks().forEach((t) => t.stop());
      await sendFile(file);
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  async function addNote() {
    if (!selectedId || !note.trim()) return;
    await api(`/conversations/${selectedId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body: note }),
    });
    setNote('');
    await loadMessages(selectedId);
  }

  function renderMessage(m: Message) {
    const isOut = m.direction === 'OUTBOUND';
    return (
      <div key={m.id} className={`bubble ${isOut ? 'out' : 'in'}`}>
        {m.type === 'IMAGE' || m.type === 'STICKER' ? (
          <img src={mediaUrl(m.mediaUrl)} alt="" />
        ) : null}
        {m.type === 'VIDEO' ? (
          <video src={mediaUrl(m.mediaUrl)} controls />
        ) : null}
        {m.type === 'AUDIO' ? (
          <audio src={mediaUrl(m.mediaUrl)} controls />
        ) : null}
        {m.type === 'DOCUMENT' ? (
          <a href={mediaUrl(m.mediaUrl)} target="_blank" rel="noreferrer">
            📄 {m.mediaFileName || 'Documento'}
          </a>
        ) : null}
        {m.body ? <div>{m.body}</div> : null}
        <div className="meta" style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: 4 }}>
          {new Date(m.createdAt).toLocaleString('pt-BR')}
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="topbar">
        <div className="tabs">
          <button
            className={`tab ${tab === 'waiting' ? 'active' : ''}`}
            onClick={() => setTab('waiting')}
          >
            Aguardando
          </button>
          <button
            className={`tab ${tab === 'mine' ? 'active' : ''}`}
            onClick={() => setTab('mine')}
          >
            Minhas
          </button>
          {canSeeAll ? (
            <button
              className={`tab ${tab === 'all' ? 'active' : ''}`}
              onClick={() => setTab('all')}
            >
              Todas
            </button>
          ) : null}
        </div>
      </div>

      <div className="inbox">
        <div className="conv-list">
          {conversations.length === 0 ? (
            <div className="empty">Nenhuma conversa nesta aba</div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                className={`conv-item ${selectedId === c.id ? 'active' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <strong>{c.contact.name || c.contact.phone}</strong>
                <span className="meta">
                  {c.messages?.[0]?.body || c.messages?.[0]?.type || c.contact.phone}
                </span>
                <span>
                  <span className={`badge ${c.status === 'ASSIGNED' ? 'assigned' : ''}`}>
                    {c.status}
                  </span>
                  {c.assignedTo ? ` · ${c.assignedTo.name}` : ''}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="chat-panel">
          {!selected ? (
            <div className="empty">Selecione uma conversa</div>
          ) : (
            <>
              <div className="chat-header">
                <div>
                  <strong>{selected.contact.name || selected.contact.phone}</strong>
                  <div className="meta" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {selected.contact.phone}
                    {selected.assignedTo ? ` · ${selected.assignedTo.name}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selected.status === 'WAITING' ? (
                    <button className="btn" onClick={claim}>
                      Pegar
                    </button>
                  ) : null}
                  {selected.status !== 'RESOLVED' ? (
                    <button className="btn secondary" onClick={resolve}>
                      Resolver
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="messages">
                {messages.map(renderMessage)}
                <div ref={bottomRef} />
              </div>

              {selected.status !== 'RESOLVED' ? (
                <div className="composer">
                  <div className="composer-tools">
                    <label className="btn secondary" style={{ padding: '0.4rem 0.8rem' }}>
                      Anexar
                      <input
                        type="file"
                        hidden
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) sendFile(f).catch(console.error);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      className={`btn secondary ${recording ? 'danger' : ''}`}
                      type="button"
                      onClick={() => toggleRecording().catch(console.error)}
                    >
                      {recording ? 'Parar áudio' : 'Gravar áudio'}
                    </button>
                    {quickReplies.length > 0 ? (
                      <select
                        value=""
                        onChange={(e) => {
                          const qr = quickReplies.find((q) => q.id === e.target.value);
                          if (qr) setText(qr.body);
                        }}
                      >
                        <option value="">Resposta rápida</option>
                        {quickReplies.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <select
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                    >
                      <option value="">Transferir para…</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={!transferTo}
                      onClick={() => transfer().catch(console.error)}
                    >
                      Transferir
                    </button>
                  </div>
                  <div className="composer-row">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Digite sua mensagem…"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendText().catch(console.error);
                        }
                      }}
                    />
                    <button className="btn" onClick={() => sendText().catch(console.error)}>
                      Enviar
                    </button>
                  </div>
                  <div className="composer-row">
                    <input
                      style={{
                        flex: 1,
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--line)',
                        borderRadius: 8,
                        color: 'var(--ink)',
                        padding: '0.55rem 0.75rem',
                      }}
                      placeholder="Nota interna (não vai ao WhatsApp)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <button className="btn secondary" onClick={() => addNote().catch(console.error)}>
                      Nota
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
