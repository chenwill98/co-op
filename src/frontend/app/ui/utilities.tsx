import { tagCategories } from '@/app/lib/definitions';

export function TagList({ category, tags }: { category: keyof typeof tagCategories; tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.filter((tag) => tagCategories[category].includes(tag)).map((tag) => (
        <div key={tag} className="badge badge-primary rounded-full badge-outline text-xs">
          {tag}
        </div>
      ))}
    </div>
  );
}