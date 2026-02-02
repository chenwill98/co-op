import { PlusIcon, MinusIcon } from "@heroicons/react/24/outline";

type ExpandButtonProps = {
  isExpanded: boolean;
  onToggle: () => void;
  expandedText?: string;
  collapsedText?: string;
};

export default function ExpandButton({
  isExpanded,
  onToggle,
  expandedText = "Less",
  collapsedText = "More"
}: ExpandButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm"
    >
      <span className="text-xs font-medium">
        {isExpanded ? expandedText : collapsedText}
      </span>
      <span className="swap swap-rotate">
        <input type="checkbox" checked={isExpanded} readOnly className="hidden" />
        {isExpanded ? (
          <MinusIcon className="text-primary" width={14} height={14} />
        ) : (
          <PlusIcon className="text-primary" width={14} height={14} />
        )}
      </span>
    </button>
  );
}