import React from 'react';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: string;
  autoFit?: boolean;
  minItemWidth?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = '',
  cols = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5, '2xl': 6 },
  gap = '1rem',
  autoFit = false,
  minItemWidth = '250px',
}) => {
  const getGridClasses = () => {
    if (autoFit) {
      return 'grid-auto-fit';
    }

    const classes = ['grid'];
    
    if (cols.xs) classes.push(`grid-cols-${cols.xs}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    if (cols['2xl']) classes.push(`2xl:grid-cols-${cols['2xl']}`);
    
    return classes.join(' ');
  };

  const gridStyle = autoFit ? {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
    gap,
  } : { gap };

  return (
    <div 
      className={`${getGridClasses()} ${className}`}
      style={gridStyle}
    >
      {children}
    </div>
  );
};

// Masonry Grid Component for Pinterest-style layouts
interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  gap?: string;
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({
  children,
  className = '',
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = '1rem',
}) => {
  const getColumnClasses = () => {
    const classes = ['columns-1'];
    
    if (columns.sm) classes.push(`sm:columns-${columns.sm}`);
    if (columns.md) classes.push(`md:columns-${columns.md}`);
    if (columns.lg) classes.push(`lg:columns-${columns.lg}`);
    
    return classes.join(' ');
  };

  return (
    <div 
      className={`${getColumnClasses()} ${className}`}
      style={{ gap, columnGap: gap }}
    >
      {React.Children.map(children, (child, index) => (
        <div 
          key={index}
          className="break-inside-avoid mb-4"
          style={{ marginBottom: gap }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

// Flexible Container Component
interface FlexContainerProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'row' | 'col';
  wrap?: boolean;
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  gap?: string;
  responsive?: {
    sm?: Partial<FlexContainerProps>;
    md?: Partial<FlexContainerProps>;
    lg?: Partial<FlexContainerProps>;
  };
}

export const FlexContainer: React.FC<FlexContainerProps> = ({
  children,
  className = '',
  direction = 'row',
  wrap = false,
  justify = 'start',
  align = 'start',
  gap,
  responsive,
}) => {
  const getFlexClasses = () => {
    const classes = ['flex'];
    
    // Direction
    if (direction === 'col') classes.push('flex-col');
    
    // Wrap
    if (wrap) classes.push('flex-wrap');
    
    // Justify
    const justifyMap = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    };
    classes.push(justifyMap[justify]);
    
    // Align
    const alignMap = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    };
    classes.push(alignMap[align]);
    
    // Responsive classes
    if (responsive?.sm) {
      if (responsive.sm.direction === 'col') classes.push('sm:flex-col');
      if (responsive.sm.justify) classes.push(`sm:${justifyMap[responsive.sm.justify]}`);
      if (responsive.sm.align) classes.push(`sm:${alignMap[responsive.sm.align]}`);
    }
    
    if (responsive?.md) {
      if (responsive.md.direction === 'col') classes.push('md:flex-col');
      if (responsive.md.justify) classes.push(`md:${justifyMap[responsive.md.justify]}`);
      if (responsive.md.align) classes.push(`md:${alignMap[responsive.md.align]}`);
    }
    
    if (responsive?.lg) {
      if (responsive.lg.direction === 'col') classes.push('lg:flex-col');
      if (responsive.lg.justify) classes.push(`lg:${justifyMap[responsive.lg.justify]}`);
      if (responsive.lg.align) classes.push(`lg:${alignMap[responsive.lg.align]}`);
    }
    
    return classes.join(' ');
  };

  return (
    <div 
      className={`${getFlexClasses()} ${className}`}
      style={{ gap }}
    >
      {children}
    </div>
  );
};