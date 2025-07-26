// src/types/declarations.d.ts

// React Slider types
declare module 'react-slider' {
  import { Component } from 'react';
  
  interface ReactSliderProps {
    className?: string;
    thumbClassName?: string;
    trackClassName?: string;
    value: number | [number, number];
    onChange: (value: number | [number, number]) => void;
    min?: number;
    max?: number;
    step?: number;
    pearling?: boolean;
    minDistance?: number;
    ariaLabel?: string | string[];
    ariaValuetext?: (state: { valueNow: number }) => string;
  }
  
  export default class ReactSlider extends Component<ReactSliderProps> {}
}

// React Window types are available via @types/react-window
// But adding this for any missing exports
declare module 'react-window' {
  export * from '@types/react-window';
}

// Lodash types are available via @types/lodash
// But adding this for any missing exports
declare module 'lodash' {
  export * from '@types/lodash';
}

// Global window extensions
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fs: {
      readFile: (path: string, options?: { encoding?: string }) => Promise<any>;
    };
  }
}

export {};
