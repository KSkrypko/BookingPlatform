import Message from './Message';

type RequestErrorProps = {
  message: string;
  loading: boolean;
  retryLabel: string;
  hasPreviousData: boolean;
  onRetry: () => void;
};

function RequestError({ message, loading, retryLabel, hasPreviousData, onRetry }: RequestErrorProps) {
  return (
    <Message type="error">
      <p className="request-error__text">{message}</p>
      {hasPreviousData && <p className="request-error__text">Wyświetlane dane mogą być nieaktualne.</p>}
      <button type="button" className="button-secondary" disabled={loading} onClick={onRetry}>
        {loading ? 'Ponawianie…' : retryLabel}
      </button>
    </Message>
  );
}

export default RequestError;
