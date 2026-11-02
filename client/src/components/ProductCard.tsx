import { useState } from 'react';
import type { Product } from '../api/products';

interface ProductCardProps {
  product: Product;
  categoryName?: string;
}

const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export default function ProductCard({
  product,
  categoryName,
}: ProductCardProps) {
  const imageUrl = product.images?.find(
    (image): image is string => typeof image === 'string' && image.trim() !== '',
  );
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const imageFailed = imageUrl !== undefined && failedImageUrl === imageUrl;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="aspect-square overflow-hidden bg-slate-100">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            onError={() => setFailedImageUrl(imageUrl)}
          />
        ) : (
          <div
            className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500"
            role="img"
            aria-label={`No image available for ${product.name}`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 48 48"
              className="h-12 w-12"
              fill="none"
            >
              <rect
                x="5"
                y="8"
                width="38"
                height="32"
                rx="4"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="17" cy="19" r="3" fill="currentColor" />
              <path
                d="m8 35 11-11 7 7 5-5 9 9"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span className="text-sm font-medium">Image unavailable</span>
          </div>
        )}
      </div>

      <div className="flex min-h-32 flex-col p-4">
        {categoryName && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            {categoryName}
          </p>
        )}
        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900">
          {product.name}
        </h2>
        <p className="mt-auto pt-4 text-lg font-bold text-slate-900">
          {priceFormatter.format(product.price)}
        </p>
      </div>
    </article>
  );
}
