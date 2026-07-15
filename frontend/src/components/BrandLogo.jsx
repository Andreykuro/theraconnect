export default function BrandLogo({ className = "", eager = false }) {
  return (
    <img
      src="/therafun-logo.png"
      alt="TheraFun Intervention Centre"
      className={`object-contain ${className}`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
