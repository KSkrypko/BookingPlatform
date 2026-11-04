import type { Service } from '../types/service';
import RequestError from './RequestError';

type ServiceListProps = {
  services: Service[];
  loading: boolean;
  error: string;
  onRetry: () => void;
};

const priceFormatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });

function ServiceList({ services, loading, error, onRetry }: ServiceListProps) {
  return (
    <>
      {error && (
        <RequestError
          message={error}
          loading={loading}
          retryLabel="Ponów pobieranie usług"
          hasPreviousData={services.length > 0}
          onRetry={onRetry}
        />
      )}
      {loading && <p className="list-state" role="status">Ładowanie usług…</p>}
      {!loading && !error && services.length === 0 && <p className="list-state">Brak usług do wyświetlenia.</p>}
      {services.length > 0 && (
        <ul className="services-list" aria-label="Usługi">
          {services.map((service) => (
            <li key={service.id} className="service-item">
              <div className="service-item__details">
                <h3>{service.name}</h3>
                <p className="service-description">{service.description ?? 'Brak opisu usługi.'}</p>
              </div>

              <dl className="service-item__meta">
                <div>
                  <dt>Cena</dt>
                  <dd className="service-price">
                    {Number.isFinite(Number(service.price)) ? priceFormatter.format(Number(service.price)) : `${service.price} PLN`}
                  </dd>
                </div>
                <div>
                  <dt>Czas trwania</dt>
                  <dd className="service-duration">{service.durationMinutes} <span>min</span></dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default ServiceList;
