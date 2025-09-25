// SEO Head Component
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'game';
  gameData?: {
    name: string;
    developer: string;
    publisher: string;
    releaseDate: string;
    genre: string;
    rating: number;
  };
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'GameVault - The Social Library for Gamers',
  description = 'Track your games, discover your next obsession, and share your gaming journey with a community that gets you.',
  image = '/og-image.jpg',
  url = window.location.href,
  type = 'website',
  gameData
}) => {
  const siteName = 'GameVault';
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const fullImage = image.startsWith('http') ? image : `${window.location.origin}${image}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {/* Game-specific structured data */}
      {gameData && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoGame",
            "name": gameData.name,
            "developer": {
              "@type": "Organization",
              "name": gameData.developer
            },
            "publisher": {
              "@type": "Organization", 
              "name": gameData.publisher
            },
            "datePublished": gameData.releaseDate,
            "genre": gameData.genre,
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": gameData.rating,
              "bestRating": 10,
              "worstRating": 1
            },
            "image": fullImage,
            "url": url
          })}
        </script>
      )}

      {/* PWA Meta Tags */}
      <meta name="theme-color" content="#1f2937" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content={siteName} />

      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://images.igdb.com" />
      <link rel="preconnect" href="https://images.pexels.com" />
      <link rel="dns-prefetch" href="https://api.igdb.com" />
    </Helmet>
  );
};