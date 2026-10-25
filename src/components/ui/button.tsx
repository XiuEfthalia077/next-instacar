import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ease-in-out cursor-pointer outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground font-bold hover:bg-[#e0b800] hover:shadow-md hover:shadow-[#ffcc00]/20 hover:scale-[1.01]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 hover:shadow-md hover:shadow-destructive/20 hover:scale-[1.01] focus-visible:ring-destructive/20 dark:bg-destructive/80 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-border bg-card shadow-xs hover:border-[#ffcc00]/60 hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-card/40 dark:hover:bg-muted/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-xs",
        ghost:
          "hover:bg-muted/70 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9.5 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6.5 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8.5 gap-1.5 rounded-lg px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-11 rounded-xl px-6 text-base has-[>svg]:px-4 font-bold",
        icon: "size-9.5 rounded-xl",
        "icon-xs": "size-6.5 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8.5 rounded-lg",
        "icon-lg": "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
