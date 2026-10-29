import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg',
        success: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-500 hover:shadow-lg',
        warning: 'bg-amber-500 text-white shadow-md shadow-amber-500/25 hover:bg-amber-400 hover:shadow-lg',
        destructive: 'bg-rose-600 text-white shadow-md shadow-rose-500/25 hover:bg-rose-500 hover:shadow-lg',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        outline: 'border border-input bg-card shadow-sm hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: { default: 'h-9 px-4', sm: 'h-8 px-3 text-xs', lg: 'h-11 px-6 text-base' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(button({ variant, size }), className)} {...props} />
}
