import AuthPanel from './AuthPanel';

type AuthScreenProps = {
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (
    email: string,
    password: string,
    accountType: 'client' | 'provider',
  ) => Promise<void>;
};

function AuthScreen({ loading, onLogin, onRegister }: AuthScreenProps) {
  return (
    <div className="auth-screen">
      <section className="auth-hero">
        <div className="auth-hero__content">
          <p className="auth-hero__eyebrow">System rezerwacji usług</p>
          <h1>Booking Platform</h1>
          <p className="auth-hero__description">
            Zaloguj się lub załóż konto, aby rozpocząć korzystanie z aplikacji.
            Klient może rezerwować terminy, a specjalista dodawać własne usługi.
          </p>
        </div>
      </section>

      <section className="card auth-screen__card">
        <div className="section-heading">
          <h2>Logowanie i rejestracja</h2>
          <p>Najpierw zaloguj się do aplikacji, aby przejść do odpowiedniego panelu.</p>
        </div>

        <AuthPanel loading={loading} onLogin={onLogin} onRegister={onRegister} />
      </section>
    </div>
  );
}

export default AuthScreen;