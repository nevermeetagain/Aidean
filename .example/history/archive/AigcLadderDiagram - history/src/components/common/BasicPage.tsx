export function BasicPage({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-black/70">{description}</p>
    </section>
  );
}
