import React from 'react';
import { Product, BusinessSettings } from '../types.ts';

interface ProductStructuredDataProps {
  products: Product[];
  settings: BusinessSettings;
}

export const ProductStructuredData: React.FC<ProductStructuredDataProps> = ({
  products,
  settings,
}) => {
  if (!products || products.length === 0) return null;

  const baseUrl = 'https://sonu-disel-bathi.vercel.app';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'itemListElement': products.map((product, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'item': {
        '@type': 'Product',
        'name': product.name,
        'image': product.imageUrl.startsWith('http') || product.imageUrl.startsWith('data:')
          ? product.imageUrl
          : `${baseUrl}${product.imageUrl}`,
        'description': `${product.name} - Sonu Diesel Bhatti commercial cooking furnaces, stoves, and bhattis used for commercial cooking, dhabas, and industrial heating. Size: ${product.size}. सोनू डीजल भट्टी, कमर्शियल भट्टी, stoves, furnaces.`,
        'sku': `SDB-${product.id}`,
        'brand': {
          '@type': 'Brand',
          'name': settings.businessName || 'Sonu Diesel Bhatti',
        },
        'offers': {
          '@type': 'Offer',
          'url': baseUrl,
          'priceCurrency': 'INR',
          'price': product.price,
          'availability': product.stockQuantity > 0 
            ? 'https://schema.org/InStock' 
            : 'https://schema.org/OutOfStock',
          'itemCondition': 'https://schema.org/NewCondition',
        },
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};
