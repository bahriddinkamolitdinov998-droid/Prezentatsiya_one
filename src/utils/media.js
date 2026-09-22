const FALLBACK_SRC =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
      <rect width="100%" height="100%" fill="#ECEBFB"/>
      <rect x="225" y="120" width="150" height="150" rx="20" fill="#6C5CE7" opacity="0.12"/>
      <path d="M255 145h90l18 22h-60v58h-48z" fill="#6C5CE7" opacity="0.5"/>
      <rect x="273" y="167" width="54" height="8" rx="4" fill="#6C5CE7" opacity="0.75"/>
      <rect x="273" y="183" width="54" height="8" rx="4" fill="#6C5CE7" opacity="0.75"/>
      <rect x="273" y="199" width="34" height="8" rx="4" fill="#6C5CE7" opacity="0.75"/>
      <text x="300" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#A9A4E8">Rasm yuklanmadi</text>
    </svg>`
  );

export const productPlaceholder = FALLBACK_SRC;

export const onProductImgError = (e) => {
  const img = e.currentTarget;
  if (img.src && !img.src.startsWith('data:image/svg+xml')) {
    img.onerror = null;
    img.src = FALLBACK_SRC;
  }
};