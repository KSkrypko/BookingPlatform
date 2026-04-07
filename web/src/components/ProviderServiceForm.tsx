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
    <form onSubmit={handleSubmit} className="provider-service-form">
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

      <label>
        Cena
        <input
          type="text"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="Np. 150.00"
        />
      </label>

      <label>
        Czas trwania
        <input
          type="number"
          min="1"
          value={durationMinutes}
          onChange={(event) => setDurationMinutes(event.target.value)}
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Zapisywanie...' : 'Dodaj usługę'}
      </button>
    </form>
  );
}

export default ProviderServiceForm;