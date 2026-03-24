type MessageProps = {
  type: 'success' | 'error';
  children: React.ReactNode;
};

function Message({ type, children }: MessageProps) {
  return <div className={`message ${type}`}>{children}</div>;
}

export default Message;