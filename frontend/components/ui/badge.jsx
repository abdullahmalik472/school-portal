import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badge = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', {
  variants: {
    variant: {
      default: 'bg-primary/10 text-primary',
      secondary: 'bg-secondary text-secondary-foreground',
      success: 'bg-emerald-100 text-emerald-700',
      warning: 'bg-amber-100 text-amber-700',
      info: 'bg-sky-100 text-sky-700',
      danger: 'bg-rose-100 text-rose-700',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badge({ variant }), className)} {...props} />
}
