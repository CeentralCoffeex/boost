'use client';

import { ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  subtitle: string;
  url: string;
}

export default function MenuBar() {
  const router = useRouter();
  const [selectedMenu, setSelectedMenu] = useState('Menu');
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setCategories([]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const isOutside = menuRef.current && !menuRef.current.contains(target);
      const isInsideDropdown = target.closest('.menu-dropdown-portal');
      if (isOutside && !isInsideDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="menu-bar-section">
      <div className="menu-bar-wrapper">
        <div className="menu-bar">
          <div
            ref={menuRef}
            className="menu-bar-trigger"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="menu-bar-label">{selectedMenu}</span>
            <ChevronDown
              className={`menu-bar-chevron ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>

          <button
            type="button"
            className="menu-bar-voir-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const urlToNavigate = selectedUrl || (categories.length > 0 && categories[0] ? `/categorie/${categories[0].id}` : '');
              if (urlToNavigate) {
                router.push(urlToNavigate);
              }
            }}
          >
            VOIR
          </button>
        </div>

        {isOpen && categories.length > 0 && (
          <div className="menu-dropdown-portal absolute left-4 top-full mt-1 w-[200px] min-w-[200px] max-w-[90vw] bg-[#f8f9fa] rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] px-4 py-3 z-[9999]">
            <div className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-widest mb-2 font-montserrat">
              CATÉGORIES
            </div>
            {categories.map((category) => (
              <div
                key={category.id}
                className={`py-1.5 cursor-pointer transition-colors font-montserrat ${selectedMenu === category.name ? 'text-blue-700' : 'text-gray-800 hover:text-blue-700'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMenu(category.name);
                  setSelectedUrl(`/categorie/${category.id}`);
                  setIsOpen(false);
                }}
              >
                {category.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
