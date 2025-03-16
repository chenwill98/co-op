import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

export default function TooltipIcon({ tooltipText }: { tooltipText: string }) {
  return (
    <div className="tooltip" data-tip={tooltipText}>
      <QuestionMarkCircleIcon className="w-4 h-4 text-gray-500 cursor-help" />
    </div>
  );
}