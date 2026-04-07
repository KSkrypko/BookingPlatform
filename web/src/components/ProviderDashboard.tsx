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
    <div className="content-grid">
      <section className="card">
        <div className="section-heading">
          <h2>Dodaj usługę</h2>
          <p>Panel usługodawcy do tworzenia nowych usług.</p>
        </div>

        <ProviderServiceForm loading={providerSubmitting} onSubmit={onSubmit} />
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Dostępne usługi</h2>
          <p>Lista usług zapisanych w systemie.</p>
        </div>

        <ServiceList services={services} loading={loadingServices} />
      </section>
    </div>
  );
}

export default ProviderDashboard;