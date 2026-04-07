import { useState } from 'react';
import type { AccountType } from '../types/auth';

type AuthPanelProps = {
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, accountType: AccountType) => Promise<void>;
};

function AuthPanel({ loading, onLogin, onRegister }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('client');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === 'login') {
      await onLogin(email, password);
      return;
    }

    await onRegister(email, password, accountType);
  };

  return (
    <div className="auth-panel">
      <div className="auth-panel__tabs">
        <button
          type="button"
          className={mode === 'login' ? 'auth-tab auth-tab--active' : 'auth-tab'}
          onClick={() => setMode('login')}
        >
          Logowanie
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'auth-tab auth-tab--active' : 'auth-tab'}
          onClick={() => setMode('register')}
        >
          Rejestracja
        </button>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Np. anna@example.com"
          />
        </label>

        <label>
          Hasło
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 6 znaków"
          />
        </label>

        {mode === 'register' && (
          <label>
            Typ konta
            <select
              value={accountType}
              onChange={(event) => setAccountType(event.target.value as AccountType)}
            >
              <option value="client">Klient</option>
              <option value="provider">Usługodawca</option>
            </select>
          </label>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Przetwarzanie...' : mode === 'login' ? 'Zaloguj się' : 'Załóż konto'}
        </button>
      </form>
    </div>
  );
}

export default AuthPanel;