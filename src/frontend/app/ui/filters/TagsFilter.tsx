"use client";

import { useState, useEffect, useRef } from "react";
import { tagCategories, getDisplayTag } from "@/app/lib/tagUtils";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface TagsFilterProps {
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export default function TagsFilter({
  selectedTags,
  setSelectedTags,
}: TagsFilterProps) {
  const [tempTags, setTempTags] = useState<string[]>([]);
  const [filterText, setFilterText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize tempTags when dropdown opens
  useEffect(() => {
    if (isOpen) setTempTags([...selectedTags]);
  }, [isOpen, selectedTags]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Filter tags based on input text
  const filteredCategories = Object.entries(tagCategories).reduce((acc, [category, tags]) => {
    const filtered = tags.filter(tag => 
      tag.name.toLowerCase().includes(filterText.toLowerCase()) || 
      tag.display.toLowerCase().includes(filterText.toLowerCase())
    );
    if (filtered.length > 0) acc[category] = filtered;
    return acc;
  }, {} as Record<string, {name: string, display: string, source: string[]}[]>);

  // Create flattened list of categories and tags
  const flattenedItems = Object.entries(filteredCategories).flatMap(([category, tags]) => [
    { type: "category" as const, text: category },
    ...tags.map(tag => ({ type: "tag" as const, text: tag.name, display: tag.display }))
  ]);

  // Event handlers
  const toggleTag = (tag: string) => {
    setTempTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const applyTags = () => {
    setSelectedTags(tempTags);
    setIsOpen(false);
  };

  const removeTag = (tag: string) => {
    const newTags = selectedTags.filter(t => t !== tag);
    setSelectedTags(newTags);
    setTempTags(newTags);
  };

  return (
    <div className="w-full">
      <div 
        ref={dropdownRef}
        className={`dropdown dropdown-top w-full ${isOpen ? 'dropdown-open' : ''}`}
      >
        <input
          type="text"
          placeholder="Choose tags"
          className="input w-full"
          onClick={() => setIsOpen(true)}
          onChange={e => setFilterText(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        
        <div className="dropdown-content glass-dropdown outline outline-1 outline-primary p-4 w-[1000px] max-h-[500px] overflow-auto z-10">
          {Object.keys(filteredCategories).length === 0 ? (
            <div className="p-2 text-gray-500">No tags found</div>
          ) : (
            <div className="columns-3 md:columns-4 gap-4 space-y-2">
              {flattenedItems.map((item, index) => (
                item.type === "category" ? (
                  <div key={index} className="font-bold border-b pb-1 break-inside-avoid">
                    {item.text}
                  </div>
                ) : (
                  <div
                    key={index}
                    className="flex items-center p-1 hover:bg-base-200 rounded cursor-pointer"
                    onClick={(e) => {
                      // Prevent the click from being handled twice
                      if (e.target === e.currentTarget) {
                        toggleTag(item.text);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={tempTags.includes(item.text)}
                      onChange={(e) => {
                        // Stop propagation to prevent the parent onClick from firing
                        e.stopPropagation();
                        toggleTag(item.text);
                      }}
                      className="checkbox checkbox-xs checkbox-primary mr-2"
                    />
                    <span className="text-xs">{item.display}</span>
                  </div>
                )
              ))}
            </div>
          )}
          
          <div className="flex gap-2 mt-4">
            <button className="btn btn-primary flex-1" onClick={applyTags}>
              Apply Tags
            </button>
            <button className="btn btn-outline" onClick={() => setIsOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
      
      {/* Selected tags */}
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedTags.map(tag => (
          <div
            key={tag}
            className="badge glass-badge-primary text-primary rounded-full text-xs flex items-center"
          >
            {getDisplayTag(tag)}
            <XMarkIcon
              onClick={() => removeTag(tag)}
              className="h-4 w-4 cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
