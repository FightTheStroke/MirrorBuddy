import { useState, useRef, useEffect, useCallback } from 'react';

export interface DropdownPosition {
  top: number;
  left: number;
}

/**
 * Hook for managing dropdown positioning and visibility
 */
export function useFilterDropdown() {
  const [showMoreTypes, setShowMoreTypes] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
  const moreTypesRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = useCallback(() => {
    if (moreTypesRef.current) {
      const rect = moreTypesRef.current.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom + 4, left: rect.left });
    }
  }, []);

  useEffect(() => {
    if (showMoreTypes) {
      updateDropdownPosition();
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition, true);
    }
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [showMoreTypes, updateDropdownPosition]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreTypesRef.current && !moreTypesRef.current.contains(event.target as Node)) {
        setShowMoreTypes(false);
      }
    }

    if (showMoreTypes) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreTypes]);

  return {
    showMoreTypes,
    setShowMoreTypes,
    dropdownPosition,
    moreTypesRef,
  };
}
