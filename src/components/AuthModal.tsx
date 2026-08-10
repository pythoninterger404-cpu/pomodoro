import React, { useState } from 'react';
import { Mail, Lock, Loader2, Chrome } from 'lucide-react';
import { supabase, loginWithGoogle } from '../lib/firebase';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email.trim() || !password.trim()) { setError('Email dan password harus diisi.'); return; }
    if (password.length < 6) { setError('Password minimal 6 karakter.'); return; }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
        setSuccess('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi, lalu login.');
        setMode('login');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal';
      if (msg.includes('Invalid login credentials')) setError('Email atau password salah.');
      else if (msg.includes('already registered')) { setError('Email sudah terdaftar. Silakan login.'); setMode('login'); }
      else setError(msg);
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError('');
    try { setLoading(true); await loginWithGoogle(); setLoading(false); } catch { setError('Google login gagal atau dibatalkan.'); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="surface rounded-2xl w-full max-w-[340px] p-5" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-[#e3e5ea] mb-4 text-center">
          {mode === 'login' ? 'Masuk ke Focus Popup' : 'Daftar Akun Baru'}
        </h2>

        {error && <div className="text-[12px] text-[#c98a8a] bg-[#c98a8a]/10 rounded-lg px-3 py-2 mb-3">{error}</div>}
        {success && <div className="text-[12px] text-[#7fa88a] bg-[#7fa88a]/10 rounded-lg px-3 py-2 mb-3">{success}</div>}

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full surface-soft rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder:text-faint focus:outline-none border border-transparent focus:border-[var(--accent,#d9a441)]/40 transition-colors" />
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full surface-soft rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder:text-faint focus:outline-none border border-transparent focus:border-[var(--accent,#d9a441)]/40 transition-colors" />
          </div>
          <button type="submit" disabled={loading}
            style={{ background: 'var(--accent,#d9a441)' }}
            className="w-full py-2.5 rounded-lg font-semibold text-sm text-[#16181d] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>
        </form>

        <div className="flex items-center gap-2 my-3">
          <span className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] text-faint">atau</span>
          <span className="flex-1 h-px bg-white/10" />
        </div>

        <button onClick={handleGoogle} disabled={loading}
          className="w-full surface-soft py-2.5 rounded-lg flex items-center justify-center gap-2 text-[#e3e5ea] text-sm font-medium hover:border-white/10 transition-colors disabled:opacity-50">
          <Chrome size={16} /> Lanjutkan dengan Google
        </button>

        <p className="mt-4 text-center text-[11px] text-dim">
          {mode === 'login' ? "Belum punya akun? " : "Sudah punya akun? "}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }} className="font-semibold hover:underline" style={{color:'var(--accent,#d9a441)'}}>
            {mode === 'login' ? 'Daftar' : 'Masuk'}
          </button>
        </p>

        <button onClick={onClose} className="w-full mt-3 text-[11px] text-faint hover:text-dim transition-colors text-center">Batal</button>
      </div>
    </div>
  );
};
