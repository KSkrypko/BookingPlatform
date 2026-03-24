import type { Service } from '../types/service';

type ServiceListProps = {
  services: Service[];
  loading: boolean;
};

function ServiceList({ services, loading }: ServiceListProps) {
  if (loading) {
    return <p>Ładowanie usług...</p>;
  }

  if (services.length === 0) {
    return <p>Brak usług do wyświetlenia.</p>;
  }

  return (
    <div className="services-list">
      {services.map((service) => (
        <article key={service.id} className="service-item">
          <div className="service-item__header">
            <h3>{service.name}</h3>
            <span className="service-price">{service.price} PLN</span>
          </div>

          <p className="service-duration">Czas trwania: {service.durationMinutes} min</p>
          <p className="service-description">{service.description ?? 'Brak opisu usługi.'}</p>
        </article>
      ))}
    </div>
  );
}

export default ServiceList;