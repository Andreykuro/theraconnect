import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import api from "../lib/api";

// Thumbnail for a file that sits behind login (e.g. diagnosis documents).
// A plain <img src="/api/..."> can't send the login token, so the file is
// fetched with the logged-in session and shown from a temporary local URL.
// Clicking opens the full image in a new tab, same as before.
export default function PrivateImage({ src, alt, title, className = "" }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    api
      .get(src.replace(/^\/api/, ""), { responseType: "blob" })
      .then(({ data }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!url) {
    return (
      <span className={`flex items-center justify-center bg-chalk text-mist ${className}`} title={title}>
        {failed ? <ImageOff size={16} /> : <Loader2 size={16} className="animate-spin" />}
      </span>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className={className} title={title}>
      <img src={url} alt={alt} className="h-full w-full object-cover" />
    </a>
  );
}
