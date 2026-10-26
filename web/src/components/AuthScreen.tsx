import type { ReactNode } from 'react';
import AuthPanel from './AuthPanel';

type AuthScreenProps = {
  loading: boolean;
  feedback: ReactNode;
  onModeChange: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (
    email: string,
    password: string,
    accountType: 'client' | 'provider',
  ) => Promise<void>;
};

function AuthScreen({ loading, feedback, onModeChange, onLogin, onRegister }: AuthScreenProps) {
  return (
    <main className="auth-screen">
      <section className="auth-intro" aria-labelledby="auth-intro-title">
        <p className="eyebrow">Dostęp do konta</p>
        <h2 id="auth-intro-title">Twój panel <span>rezerwacji.</span></h2>
        <p className="auth-intro__description">
          Rezerwuj terminy jako klient lub dodawaj usługi jako usługodawca.
        </p>

        <dl className="auth-account-guide">
          <div>
            <dt>Dla klientów</dt>
            <dd>Wolne terminy i Twoje rezerwacje.</dd>
          </div>
          <div>
            <dt>Dla usługodawców</dt>
            <dd>Usługi, ceny i czas ich trwania.</dd>
          </div>
        </dl>
        <p className="auth-intro__note">Typ konta wybierzesz podczas rejestracji.</p>
      </section>

      <section className="auth-screen__card" aria-labelledby="auth-form-title">
        <AuthPanel
          loading={loading}
          feedback={feedback}
          onModeChange={onModeChange}
          onLogin={onLogin}
          onRegister={onRegister}
        />
      </section>
    </main>
  );
}

export default AuthScreen;
