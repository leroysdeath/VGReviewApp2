import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  className = '',
  headerClassName = '',
  contentClassName = '',
  icon,
  badge,
  disabled = false,
  onToggle,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);
  const contentRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (disabled) return;
    
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    onToggle?.(newIsOpen);
  };

  useEffect(() => {
    if (!contentRef.current) return;

    if (isOpen) {
      const scrollHeight = contentRef.current.scrollHeight;
      setHeight(scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  return (
    <div className={`border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={toggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-4 text-left bg-gray-800 hover:bg-gray-750 transition-colors duration-200 touch-target ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${headerClassName}`}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${title}`}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {icon && (
            <div className="flex-shrink-0 text-game-purple">
              {icon}
            </div>
          )}
          <h3 className="font-semibold text-white truncate">{title}</h3>
          {badge && (
            <span className="flex-shrink-0 bg-game-purple text-white text-xs px-2 py-1 rounded-full">
              {badge}
            </span>
          )}
        </div>
        
        <div className="flex-shrink-0 ml-3">
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400 transition-transform duration-200" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400 transition-transform duration-200" />
          )}
        </div>
      </button>

      {/* Content */}
      <div
        ref={contentRef}
        id={`collapsible-content-${title}`}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ height }}
      >
        <div className={`p-4 bg-gray-900 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Accordion component for multiple collapsible sections
interface AccordionProps {
  children: React.ReactElement<CollapsibleSectionProps>[];
  allowMultiple?: boolean;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  children,
  allowMultiple = false,
  className = '',
}) => {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());

  const handleToggle = (index: number, isOpen: boolean) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      
      if (isOpen) {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(index);
      } else {
        newSet.delete(index);
      }
      
      return newSet;
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        return React.cloneElement(child, {
          ...child.props,
          defaultOpen: openSections.has(index),
          onToggle: (isOpen: boolean) => {
            handleToggle(index, isOpen);
            child.props.onToggle?.(isOpen);
          },
        });
      })}
    </div>
  );
};