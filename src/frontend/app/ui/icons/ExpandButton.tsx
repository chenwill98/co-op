import { PlusIcon, MinusIcon } from "@heroicons/react/24/outline";

type ExpandButtonProps = {
  isExpanded: boolean;
  onToggle: () => void;
};

export default function ExpandButton({ isExpanded, onToggle }: ExpandButtonProps) {
  return (
    <div className="flex items-center gap-1">
      <label className="text-primary cursor-pointer text-sm" onClick={onToggle}>
        {isExpanded ? "Less" : "More"}
      </label>
      <label className="swap swap-rotate">
      {/* Controlled checkbox */}
      <input type="checkbox" checked={isExpanded} onChange={onToggle} />

      {/* hamburger icon (shown when checkbox is unchecked) */}
      <PlusIcon className="swap-off text-primary" width={16} height={16} />

      {/* close icon (shown when checkbox is checked) */}
      <MinusIcon className="swap-on text-primary" width={16} height={16} />
      </label>
    </div>
  );
}