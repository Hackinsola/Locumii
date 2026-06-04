// Friendly empty-state placeholder: a muted icon above a short message, inside a
// dashed-border panel. Dumb — pass a lucide `icon` and the message as children.
function EmptyState({ icon: Icon, children }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-4 py-12 text-center">
      {Icon && <Icon className="size-8 text-muted-foreground" aria-hidden="true" />}
      <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export default EmptyState;
