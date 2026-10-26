import { useState } from 'react';

type ProviderServiceFormProps = {
  loading: boolean;
  onSubmit: (payload: {
    name: string;
    description: string | null;
    price: string;
    durationMinutes: number;
  }) => Promise<void>;
};

function ProviderServiceForm({ loading, onSubmit }: ProviderServiceFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      name,
      description: description.trim() === '' ? null : description.trim(),
      price,
      durationMinutes: Number(durationMinutes),
    });

    setName('');
    setDescription('');
    setPrice('');
    setDurationMinutes('60');
  };

  return (
    <form onSubmit={handleSubmit} className="provider-service-form" aria-busy={loading}>
      <fieldset className="provider-service-form__fields" disabled={loading}>
        <legend className="sr-only">Szczegóły usługi</legend>
        <label>
          Nazwa usługi
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Np. Laminacja brwi"
          />
        </label>

        <label>
          Opis
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Krótki opis usługi"
          />
        </label>

        <div className="provider-service-form__row">
          <div className="form-field">
            <label htmlFor="service-price">Cena</label>
            <div className="input-affix">
              <input
                id="service-price"
                type="text"
                inputMode="decimal"
                aria-describedby="service-currency"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="150.00"
              />
              <span id="service-currency">PLN</span>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="service-duration">Czas trwania</label>
            <div className="input-affix">
              <input
                id="service-duration"
                type="number"
                min="1"
                aria-describedby="service-duration-unit"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
              />
              <span id="service-duration-unit">min</span>
            </div>
          </div>
        </div>
      </fieldset>

      <button type="submit" className="button-primary" disabled={loading}>
        {loading ? 'Zapisywanie...' : 'Dodaj usługę'}
      </button>
    </form>
  );
}

export default ProviderServiceForm;
