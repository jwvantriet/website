/**
 * Renders a schema.org object as an application/ld+json script tag.
 * Server component — no client JS. JSON.stringify output is escaped to
 * prevent `</script>` breakout from data-sourced strings.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
