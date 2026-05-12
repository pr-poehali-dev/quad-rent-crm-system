import { createElement } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface IconProps extends LucideProps {
  name: string;
  fallback?: string;
}

const Icon = ({ name, fallback = 'CircleAlert', ...props }: IconProps) => {
  const icons = LucideIcons as Record<string, unknown>;
  const Comp = icons[name] as ((p: LucideProps) => JSX.Element) | undefined;

  if (!Comp) {
    const Fallback = icons[fallback] as ((p: LucideProps) => JSX.Element) | undefined;
    if (!Fallback) return createElement('span', { className: 'text-xs text-gray-400' }, '·');
    return createElement(Fallback, props);
  }

  return createElement(Comp, props);
};

export default Icon;
