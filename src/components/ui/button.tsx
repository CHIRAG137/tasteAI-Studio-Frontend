import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/80 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-0 bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-md hover:shadow-lg hover:from-purple-700 hover:to-cyan-600 dark:from-purple-500 dark:to-cyan-400 dark:hover:from-purple-400 dark:hover:to-cyan-300",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft hover:shadow-medium",
        outline:
          "border border-purple-200 bg-background text-foreground shadow-soft hover:border-purple-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-cyan-50 hover:text-purple-950 dark:border-purple-500/30 dark:hover:from-purple-950/40 dark:hover:to-cyan-950/30 dark:hover:text-purple-50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft hover:shadow-medium",
        ghost:
          "hover:bg-purple-50/80 hover:text-purple-950 dark:hover:bg-purple-950/40 dark:hover:text-purple-50",
        link: "text-purple-600 underline-offset-4 hover:underline hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300",
        gradient:
          "border-0 bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-md hover:shadow-lg hover:from-purple-700 hover:to-cyan-600 dark:from-purple-500 dark:to-cyan-400 dark:hover:from-purple-400 dark:hover:to-cyan-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
