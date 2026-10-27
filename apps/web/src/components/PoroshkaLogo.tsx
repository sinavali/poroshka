import React from 'react';

interface PoroshkaLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}

export function PoroshkaLogo({ size = 36, className = '', showWordmark = true }: PoroshkaLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Official Geometric Ribbon + Diamond Dot + Sparkle Star */}
      <svg
        width={size}
        height={Math.round((size * 150) / 140)}
        viewBox="0 0 140 150"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        aria-label="لوگوی پوروشکا"
      >
        <defs>
          <linearGradient id="poroshkaRibbonGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2864F0" />
            <stop offset="55%" stopColor="#4B55F2" />
            <stop offset="100%" stopColor="#7548F5" />
          </linearGradient>
          <linearGradient id="poroshkaFoldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7FB0FF" />
            <stop offset="100%" stopColor="#2864F0" />
          </linearGradient>
        </defs>
        <path
          fill="url(#poroshkaRibbonGrad)"
          fillRule="evenodd"
          d="M44 12C24 12 12 26 12 44L12 74C12 92 26 104 44 104L52 104C88 104 118 88 118 56L118 44C118 26 104 12 86 12ZM50 42L84 36C92 34.5 98 40 98 48L98 54C98 66 86 74 70 76L56 78C50 79 46 75 46 69L46 50C46 46 47 43 50 42Z"
        />
        <path
          fill="url(#poroshkaFoldGrad)"
          d="M12 74C12 92 26 104 44 104L46 104L46 78C32 78 20 70 12 56Z"
        />
        <rect
          x="40"
          y="112"
          width="22"
          height="22"
          rx="4"
          transform="rotate(45 51 123)"
          fill="#10265D"
        />
        <path
          fill="#FFB51B"
          d="M120 2C122.2 12.4 126.6 16.8 137 19C126.6 21.2 122.2 25.6 120 36C117.8 25.6 113.4 21.2 103 19C113.4 16.8 117.8 12.4 120 2Z"
        />
      </svg>

      {showWordmark && (
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight text-[#10265D] leading-none">
            پوروشکا
          </span>
          <span className="text-[10px] text-[#5A6B8C] font-semibold mt-1">
            کتابخانه پرامپت‌های آماده
          </span>
        </div>
      )}
    </div>
  );
}
