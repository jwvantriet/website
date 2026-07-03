/**
 * Brand-treated image: renders the photo with slightly tamed saturation and a
 * navy gradient overlay (multiply), so mixed stock photography reads as one
 * Confair-branded system. Server component, no JS.
 *
 * Used for blog covers and the image library. Tune the treatment here and it
 * changes everywhere at once.
 */
export default function BrandedImage({
  src,
  alt,
  imgClassName = '',
}: {
  src: string;
  alt: string;
  imgClassName?: string;
}) {
  return (
    <div className="relative w-full h-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={`${imgClassName} saturate-[0.85] contrast-[1.02]`} />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-multiply bg-gradient-to-t from-navy/45 via-navy/10 to-navy/5"
      />
    </div>
  );
}
