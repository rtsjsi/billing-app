import os

filepath = r'd:\myProjects\billing-app\frontend\src\components\Layout.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'bg-slate-50 text-slate-900': 'bg-slate-950 text-slate-50',
    'bg-white border-r border-slate-200': 'bg-slate-900 border-r border-slate-800',
    'text-slate-900': 'text-slate-50',
    'bg-slate-50/50': 'bg-slate-900/50',
    'border-slate-100': 'border-slate-800',
    'text-slate-800': 'text-slate-200',
    'text-slate-600': 'text-slate-400',
    'hover:text-slate-900 hover:bg-slate-100': 'hover:text-white hover:bg-slate-800',
    'bg-white border-b border-slate-200': 'bg-slate-900/90 backdrop-blur border-b border-slate-800',
    'bg-white border border-slate-300': 'bg-slate-800 border border-slate-700',
    'border-t border-slate-200': 'border-t border-slate-800',
    'text-slate-700': 'text-slate-300',
    'bg-sky-50 text-sky-700 border border-sky-100': 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    'bg-sky-50': 'bg-sky-900/30',
    'border-sky-100': 'border-sky-800/50',
    'text-sky-600': 'text-sky-400',
    'fill-sky-100': 'fill-sky-900/40',
    'bg-slate-50': 'bg-slate-950',
    'bg-white': 'bg-slate-900',
    'text-slate-500': 'text-slate-400',
    'text-black': 'text-black',
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
