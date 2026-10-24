import * as SliderPrimitive from '@radix-ui/react-slider'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { cn } from '@/lib/cn'

interface SliderProps extends ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /** Um rótulo acessível por alça (ex.: ["Preço mínimo", "Preço máximo"]). */
  thumbLabels: string[]
}

export const Slider = forwardRef<ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, thumbLabels, ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn('relative flex w-full touch-none select-none items-center py-2', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-0.5 w-full grow overflow-hidden rounded-full bg-muted-foreground/40">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {thumbLabels.map((label) => (
        <SliderPrimitive.Thumb
          key={label}
          aria-label={label}
          className="block size-3.5 rounded-full border-2 border-primary bg-primary shadow transition-transform hover:scale-110"
        />
      ))}
    </SliderPrimitive.Root>
  ),
)
Slider.displayName = 'Slider'
