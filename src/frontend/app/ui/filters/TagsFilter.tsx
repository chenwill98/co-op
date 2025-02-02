import { useState } from 'react';
import { tagCategories } from '@/app/lib/definitions';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface TagsFilterProps {
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export default function TagsFilter({ selectedTags, setSelectedTags }: TagsFilterProps) {
  const [checkedTags, setCheckedTags] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');

  // Toggle a tag in the list of checkboxes
  const toggleTag = (tag: string) => {
    setCheckedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Apply the checkbox selections as the selected tags
  const applyTags = () => {
    setSelectedTags(checkedTags);
  };

  // Remove a tag from the selected tags list
  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  // Filter the tag categories by the text entered
  const filteredCategories = Object.entries(tagCategories).reduce((acc, [category, tags]) => {
    const filtered = tags.filter((tag) =>
      tag.toLowerCase().includes(filterText.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, string[]>);

  const noTagsFound = Object.keys(filteredCategories).length === 0;

  // Flatten the categories and tags into one array.
  // This creates a list where a category header is followed by its tag items.
  const flattenedItems: { type: 'category' | 'tag'; text: string }[] = [];
  for (const [category, tags] of Object.entries(filteredCategories)) {
    flattenedItems.push({ type: 'category', text: category });
    for (const tag of tags) {
      flattenedItems.push({ type: 'tag', text: tag });
    }
  }

  return (
    <div className="w-full">
      <div className="dropdown dropdown-top w-full">
        <input
          type="text"
          placeholder="Select tags..."
          className="input input-bordered w-full"
          tabIndex={0}
          onChange={(e) => setFilterText(e.target.value)}
          onFocus={() => setCheckedTags(selectedTags)}
        />
        <div
          tabIndex={0}
          className="dropdown-content p-4 shadow bg-base-100 rounded-box w-[800px] max-h-[450px] mt-1 overflow-auto z-[9999]"
        >
          {noTagsFound ? (
            <div className="p-2 text-gray-500">No tags found</div>
          ) : (
            <div className="columns-2 md:columns-3 gap-4 space-y-2">
              {flattenedItems.map((item, index) =>
                item.type === 'category' ? (
                  <div
                    key={index}
                    className="font-bold border-b pb-1 break-inside-avoid"
                  >
                    {item.text}
                  </div>
                ) : (
                  <div
                    key={index}
                    className="flex items-center break-inside-avoid"
                  >
                    <input
                      type="checkbox"
                      checked={checkedTags.includes(item.text)}
                      onChange={() => toggleTag(item.text)}
                      className="checkbox checkbox-xs checkbox-primary mr-2"
                    />
                    <span className="text-sm">{item.text}</span>
                  </div>
                )
              )}
            </div>
          )}
          <button className="btn btn-primary mt-4 w-full" onClick={applyTags}>
            Apply Tags
          </button>
        </div>
      </div>
      {/* Display the selected tags */}
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedTags.map((tag) => (
          <div
            key={tag}
            className="badge badge-primary rounded-full badge-outline text-xs flex items-center"
          >
            {tag}
            <XMarkIcon
              onClick={() => removeTag(tag)}
              className="h-4 w-4 cursor-pointer ml-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}