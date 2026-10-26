import type { Service } from '../types/service';

type ServiceListProps = {
  services: Service[];
  loading: boolean;
};

const priceFormatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });

function ServiceList({ services, loading }: ServiceListProps) {
  if (loading) {
    return <p className="list-state" role="status">Ładowanie usług…</p>;
  }

  if (services.length === 0) {
    return <p className="list-state">Brak usług do wyświetlenia.</p>;
  }

  return (
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
  );
}

export default ServiceList;
