import { useState, type ReactNode } from 'react';
import type { AccountType } from '../types/auth';

type AuthPanelProps = {
  loading: boolean;
  feedback: ReactNode;
  onModeChange: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, accountType: AccountType) => Promise<void>;
};

function AuthPanel({ loading, feedback, onModeChange, onLogin, onRegister }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('client');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const isRegister = mode === 'register';

  const changeMode = (nextMode: 'login' | 'register') => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setErrors({});
    setShowPassword(false);
    onModeChange();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    const form = event.currentTarget;
    const emailInput = form.elements.namedItem('email') as HTMLInputElement;
    const nextErrors: typeof errors = {};

    if (!emailInput.validity.valid) {
      nextErrors.email = email.trim() ? 'Podaj poprawny adres email.' : 'Podaj adres email.';
    }
    if (!password) {
      nextErrors.password = 'Podaj hasło.';
    } else if (isRegister && password.trim().length < 6) {
      nextErrors.password = 'Hasło musi mieć co najmniej 6 znaków.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const field = nextErrors.email ? emailInput : form.elements.namedItem('password');
      (field as HTMLInputElement).focus();
      return;
    }

    if (mode === 'login') {
      await onLogin(email.trim(), password);
      return;
    }

    await onRegister(email.trim(), password, accountType);
  };

  return (
    <div className="auth-panel">
      <div className="auth-panel__tabs" role="group" aria-label="Dostęp do konta">
        <button
          type="button"
          className={mode === 'login' ? 'auth-tab auth-tab--active' : 'auth-tab'}
          aria-pressed={mode === 'login'}
          disabled={loading}
          onClick={() => changeMode('login')}
        >
          Logowanie
        </button>
        <button
          type="button"
          className={isRegister ? 'auth-tab auth-tab--active' : 'auth-tab'}
          aria-pressed={isRegister}
          disabled={loading}
          onClick={() => changeMode('register')}
        >
          Rejestracja
        </button>
      </div>

      <div className="auth-panel__heading">
        <h2 id="auth-form-title">{isRegister ? 'Utwórz konto' : 'Zaloguj się'}</h2>
        <p>{isRegister ? 'Wybierz typ konta i podaj dane logowania.' : 'Wprowadź email i hasło do swojego konta.'}</p>
      </div>

      {feedback}

      <form onSubmit={handleSubmit} className="auth-form" noValidate aria-busy={loading}>
        <fieldset className="auth-form__fields" disabled={loading}>
          <legend className="sr-only">{isRegister ? 'Dane nowego konta' : 'Dane logowania'}</legend>
          {isRegister && (
            <div className="form-field">
              <label htmlFor="auth-account-type">Typ konta</label>
              <select
                id="auth-account-type"
                name="accountType"
                value={accountType}
                aria-describedby="account-type-hint"
                onChange={(event) => setAccountType(event.target.value as AccountType)}
              >
                <option value="client">Klient</option>
                <option value="provider">Usługodawca</option>
              </select>
              <span className="field-hint" id="account-type-hint">
                {accountType === 'client' ? 'Chcę rezerwować usługi.' : 'Chcę dodawać własne usługi.'}
              </span>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              name="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'auth-email-error' : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => ({ ...current, email: undefined }));
              }}
              placeholder="anna@example.com"
            />
            {errors.email && <span className="field-error" id="auth-email-error">{errors.email}</span>}
          </div>

          <div className="auth-password-field">
            <label htmlFor="auth-password">Hasło</label>
            <div className="password-control">
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
                minLength={isRegister ? 6 : undefined}
                value={password}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'auth-password-error' : isRegister ? 'auth-password-hint' : undefined}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrors((current) => ({ ...current, password: undefined }));
                }}
                placeholder={isRegister ? 'Utwórz hasło' : 'Wprowadź hasło'}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Ukryj' : 'Pokaż'}
              </button>
            </div>
            {isRegister && <span className="field-hint" id="auth-password-hint">Co najmniej 6 znaków.</span>}
            {errors.password && <span className="field-error" id="auth-password-error">{errors.password}</span>}
          </div>
        </fieldset>

        <button type="submit" className="button-primary" disabled={loading}>
          {loading ? 'Przetwarzanie…' : isRegister ? 'Załóż konto' : 'Zaloguj się'}
        </button>
        <p className="auth-form__note">
          {isRegister ? 'Po utworzeniu konta zalogujesz się do aplikacji.' : 'Nie masz jeszcze konta?'}
          {!isRegister && <button type="button" className="button-link" disabled={loading} onClick={() => changeMode('register')}>Zarejestruj się</button>}
        </p>
      </form>
    </div>
  );
}

export default AuthPanel;
