type MessageProps = {
  type: 'success' | 'error';
  children: React.ReactNode;
};

function Message({ type, children }: MessageProps) {
  return <div className={`message ${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export default Message;
