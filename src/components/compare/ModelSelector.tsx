import type { ChangeEvent } from 'react';

import type { OpenRouterModelOption } from '@/components/compare/types';

interface ModelSelectorProps {
  value: string;
  models: OpenRouterModelOption[];
  isLoading: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function formatContextLength(contextLength?: number) {
  if (!contextLength) return null;
  if (contextLength >= 1000) {
    return `${Math.round(contextLength / 1000)}k`;
  }
  return `${contextLength}`;
}

const ModelSelector = ({
  value,
  models,
  isLoading,
  disabled = false,
  onChange,
}: ModelSelectorProps) => {
  const selectedModel = models.find((model) => model.id === value);
  const selectedContext = formatContextLength(selectedModel?.context_length);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="min-w-0">
      <label className="block text-sm font-medium text-slate-100">
        <span className="sr-only">OpenRouter model</span>
        <select
          value={value}
          onChange={handleChange}
          disabled={disabled || isLoading}
          className="h-10 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 text-sm text-slate-100 outline-none transition-colors focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {!models.some((model) => model.id === value) ? (
            <option value={value}>{value}</option>
          ) : null}
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {selectedContext ? (
          <span className="rounded-full border border-slate-700/80 bg-slate-800/60 px-2 py-0.5">
            {selectedContext} ctx
          </span>
        ) : null}
        {isLoading ? <span>Loading models...</span> : null}
      </div>
    </div>
  );
};

export default ModelSelector;
