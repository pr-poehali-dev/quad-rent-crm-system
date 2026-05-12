import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface IconProps extends LucideProps {
  name: string;
  fallback?: string;
}

const Icon = ({ name, fallback = 'CircleAlert', ...props }: IconProps) => {
  const IconComponent = (LucideIcons as Record<string, (p: LucideProps) => JSX.Element | null>)[name];

  if (!IconComponent) {
    const FallbackIcon = (LucideIcons as Record<string, (p: LucideProps) => JSX.Element | null>)[fallback];
    if (!FallbackIcon) {
      return <span className="text-xs text-gray-400">[icon]</span>;
    }
    return <FallbackIcon {...props} />;
  }

  return <IconComponent {...props} />;
};

export default Icon;
