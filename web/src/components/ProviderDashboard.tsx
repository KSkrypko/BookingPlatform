import type { Service } from '../types/service';
import ProviderServiceForm from './ProviderServiceForm';
import ServiceList from './ServiceList';

type ProviderDashboardProps = {
  services: Service[];
  loadingServices: boolean;
  providerSubmitting: boolean;
  onSubmit: (payload: {
    name: string;
    description: string | null;
    price: string;
    durationMinutes: number;
  }) => Promise<void>;
};

function ProviderDashboard({
  services,
  loadingServices,
  providerSubmitting,
  onSubmit,
}: ProviderDashboardProps) {
  return (
    <div className="provider-dashboard">
      <div className="page-heading">
        <p className="eyebrow">Panel usługodawcy</p>
        <h2>Usługi</h2>
        <p>Dodawaj usługi i przeglądaj aktualny katalog.</p>
      </div>

      <div className="provider-workspace">
        <section className="provider-workspace__form" aria-labelledby="provider-form-title">
          <div className="section-heading">
            <h2 id="provider-form-title">Dodaj usługę</h2>
            <p>Podaj szczegóły nowej usługi.</p>
          </div>

          <ProviderServiceForm loading={providerSubmitting} onSubmit={onSubmit} />
        </section>

        <section className="provider-workspace__catalog" aria-labelledby="provider-catalog-title">
          <div className="section-heading">
            <h2 id="provider-catalog-title">Katalog usług</h2>
            <p>Usługi dostępne w aplikacji.</p>
          </div>

          <ServiceList services={services} loading={loadingServices} />
        </section>
      </div>
    </div>
  );
}

export default ProviderDashboard;
