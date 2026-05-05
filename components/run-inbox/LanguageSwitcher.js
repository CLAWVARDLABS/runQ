'use client';

import React from 'react';

function h(type, props, ...children) {
  const normalizedChildren = children.flatMap((child) =>
    Array.isArray(child) ? React.Children.toArray(child.filter(Boolean)) : [child]
  );
  return React.createElement(type, props, ...normalizedChildren);
}

const languages = [
  ['zh', '中文', '简体中文'],
  ['en', 'English', 'English']
];

function languageHref(pathname, lang) {
  return `${pathname || '/agents'}?lang=${lang}`;
}

function GlobeIcon() {
  return h('svg', {
    'aria-hidden': 'true',
    className: 'h-4 w-4',
    fill: 'none',
    viewBox: '0 0 24 24'
  }, [
    h('circle', { cx: '12', cy: '12', r: '9', stroke: 'currentColor', strokeWidth: '1.8' }),
    h('path', { d: 'M3.75 12h16.5M12 3c2.2 2.35 3.3 5.35 3.3 9s-1.1 6.65-3.3 9M12 3c-2.2 2.35-3.3 5.35-3.3 9s1.1 6.65 3.3 9', stroke: 'currentColor', strokeLinecap: 'round', strokeWidth: '1.8' })
  ]);
}

function ChevronIcon() {
  return h('svg', {
    'aria-hidden': 'true',
    className: 'h-3.5 w-3.5 text-slate-400 transition group-open:rotate-180',
    fill: 'none',
    viewBox: '0 0 20 20'
  }, h('path', {
    d: 'm5 7.5 5 5 5-5',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: '1.8'
  }));
}

export function LanguageSwitcher({ lang, setLang, pathname = '/agents' }) {
  const active = languages.find(([code]) => code === lang) || languages[0];

  return h('details', {
    className: 'group relative',
    key: 'language-switcher'
  }, [
    h('summary', {
      'aria-label': 'Change language',
      className: 'flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] [&::-webkit-details-marker]:hidden'
    }, [
      h(GlobeIcon, { key: 'globe' }),
      h('span', { key: 'active' }, active[1]),
      h(ChevronIcon, { key: 'chevron' })
    ]),
    h('div', {
      className: 'absolute right-0 z-40 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.14)]'
    }, languages.map(([code, label, description]) =>
      h('a', {
        className: [
          'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition',
          code === lang ? 'bg-[#f2f3ff] font-semibold text-[#4f46e5]' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950'
        ].join(' '),
        href: languageHref(pathname, code),
        key: code,
        onClick: () => setLang(code)
      }, [
        h('span', null, label),
        h('span', { className: 'text-xs text-slate-400' }, description)
      ])
    ))
  ]);
}

