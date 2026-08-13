// Props to https://github.com/shadcn-ui/ui/issues/885#issuecomment-2059600641

"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "#client/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  const initialValue = Array.isArray(props.value) ? props.value : [props.min, props.max];

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="bg-secondary relative h-2 w-full grow overflow-hidden rounded-full">
        <SliderPrimitive.Range className="bg-primary absolute h-full" />
      </SliderPrimitive.Track>
      {initialValue.map((_, index) => (
        <React.Fragment key={index}>
          <SliderPrimitive.Thumb className="border-primary bg-background ring-offset-background focus-visible:ring-ring block h-4 w-4 rounded-full border-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
        </React.Fragment>
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
