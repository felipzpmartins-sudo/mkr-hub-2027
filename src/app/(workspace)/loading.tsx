export default function Loading() {
  return (
    <div className="loading-state" role="status" aria-label="Carregando conteúdo">
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-banner" />
      <div className="systems-grid">
        {[1, 2, 3].map((i) => (
          <div className="skeleton skeleton-card" key={i} />
        ))}
      </div>
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
