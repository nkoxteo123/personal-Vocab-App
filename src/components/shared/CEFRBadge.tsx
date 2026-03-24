import type { CEFRLevel } from '../../types';

const CEFR_CLASS: Record<CEFRLevel, string> = {
  A1: 'cefr-a1',
  A2: 'cefr-a2',
  B1: 'cefr-b1',
  B2: 'cefr-b2',
  C1: 'cefr-c1',
  C2: 'cefr-c2',
};

interface Props {
  level: CEFRLevel;
  size?: 'sm' | 'md';
}

export default function CEFRBadge({ level, size = 'sm' }: Props) {
  return (
    <span
      className={`cefr-badge ${CEFR_CLASS[level]}`}
      style={size === 'md' ? { padding: '4px 14px', fontSize: '0.8rem' } : undefined}
    >
      {level}
    </span>
  );
}
