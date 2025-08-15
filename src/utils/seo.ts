// SEO utilities for game pages
export interface GameSEOData {
  title: string;
  description: string;
  image: string;
  url: string;
  developer: string;
  publisher: string;
  releaseDate: string;
  genre: string;
  rating: number;
  platforms: string[];
  price?: string;
}

export const generateGameSEO = (game: GameSEOData) => {
  const baseUrl = window.location.origin;
  const gameUrl = `${baseUrl}/game/${game.url}`;
  
  return {
    title: `${game.title} - Reviews, Screenshots & Details | GameVault`,
    description: `${game.description.substring(0, 155)}...`,
    canonical: gameUrl,
    openGraph: {
      type: 'game',
      title: game.title,
      description: game.description,
      image: game.image,
      url: gameUrl,
      siteName: 'GameVault',
      locale: 'en_US'
    },
    twitter: {
      card: 'summary_large_image',
      title: game.title,
      description: game.description,
      image: game.image,
      site: '@gamevault',
      creator: '@gamevault'
    },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: game.title,
      description: game.description,
      image: game.image,
      url: gameUrl,
      developer: {
        '@type': 'Organization',
        name: game.developer
      },
      publisher: {
        '@type': 'Organization',
        name: game.publisher
      },
      datePublished: game.releaseDate,
      genre: game.genre,
      gamePlatform: game.platforms,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: game.rating,
        bestRating: 10,
        worstRating: 1,
        ratingCount: 1000 // This would come from actual data
      },
      offers: game.price ? {
        '@type': 'Offer',
        price: game.price.replace('$', ''),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock'
      } : undefined
    }
  };
};

export const updatePageMeta = (seoData: ReturnType<typeof generateGameSEO>) => {
  // Update title
  document.title = seoData.title;
  
  // Update meta description
  updateMetaTag('description', seoData.description);
  
  // Update canonical URL
  updateLinkTag('canonical', seoData.canonical);
  
  // Update Open Graph tags
  updateMetaTag('og:type', seoData.openGraph.type);
  updateMetaTag('og:title', seoData.openGraph.title);
  updateMetaTag('og:description', seoData.openGraph.description);
  updateMetaTag('og:image', seoData.openGraph.image);
  updateMetaTag('og:url', seoData.openGraph.url);
  updateMetaTag('og:site_name', seoData.openGraph.siteName);
  updateMetaTag('og:locale', seoData.openGraph.locale);
  
  // Update Twitter Card tags
  updateMetaTag('twitter:card', seoData.twitter.card);
  updateMetaTag('twitter:title', seoData.twitter.title);
  updateMetaTag('twitter:description', seoData.twitter.description);
  updateMetaTag('twitter:image', seoData.twitter.image);
  updateMetaTag('twitter:site', seoData.twitter.site);
  updateMetaTag('twitter:creator', seoData.twitter.creator);
  
  // Update structured data
  updateStructuredData(seoData.structuredData);
};

const updateMetaTag = (property: string, content: string) => {
  const selector = `meta[property="${property}"], meta[name="${property}"]`;
  let element = document.querySelector(selector) as HTMLMetaElement;
  
  if (!element) {
    element = document.createElement('meta');
    if (property.startsWith('og:') || property.startsWith('twitter:')) {
      element.setAttribute('property', property);
    } else {
      element.setAttribute('name', property);
    }
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
};

const updateLinkTag = (rel: string, href: string) => {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  
  element.setAttribute('href', href);
};

const updateStructuredData = (data: any) => {
  const selector = 'script[type="application/ld+json"]';
  let element = document.querySelector(selector) as HTMLScriptElement;
  
  if (!element) {
    element = document.createElement('script');
    element.setAttribute('type', 'application/ld+json');
    document.head.appendChild(element);
  }
  
  element.textContent = JSON.stringify(data);
};

// Preload critical resources
export const preloadGameAssets = (game: GameSEOData) => {
  // Preload hero image
  const heroLink = document.createElement('link');
  heroLink.rel = 'preload';
  heroLink.as = 'image';
  heroLink.href = game.image;
  document.head.appendChild(heroLink);
  
  // Preload critical CSS
  const cssLink = document.createElement('link');
  cssLink.rel = 'preload';
  cssLink.as = 'style';
  cssLink.href = '/src/styles/game-page.css';
  document.head.appendChild(cssLink);
};

// Generate breadcrumb structured data
export const generateBreadcrumbData = (game: GameSEOData) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: window.location.origin
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Games',
        item: `${window.location.origin}/games`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: game.title,
        item: `${window.location.origin}/game/${game.url}`
      }
    ]
  };
};