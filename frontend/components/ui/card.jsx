import { cn } from '@/lib/utils'

export const Card = ({ className, ...props }) => (
  <div className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)} {...props} />
)
export const CardHeader = ({ className, ...props }) => <div className={cn('space-y-1 p-6 pb-3', className)} {...props} />
export const CardTitle = ({ className, ...props }) => (
  <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
)
export const CardDescription = ({ className, ...props }) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
)
export const CardContent = ({ className, ...props }) => <div className={cn('p-6 pt-3', className)} {...props} />
