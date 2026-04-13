// frontend/src/components/ui/index.jsx

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function for conditional classes
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Button Component
export const Button = ({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}) => {
  const variants = {
    default: "bg-slate-900 text-slate-50 hover:bg-slate-900/90",
    destructive: "bg-red-500 text-slate-50 hover:bg-red-500/90",
    outline:
      "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    ghost: "hover:bg-slate-100 hover:text-slate-900",
    link: "text-slate-900 underline-offset-4 hover:underline",
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// Input Component
export const Input = ({ className, type, ...props }) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
};

// Textarea Component
export const Textarea = ({ className, ...props }) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
};

// Card Components
export const Card = ({ className, ...props }) => (
  <div
    className={cn(
      "rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm",
      className
    )}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }) => (
  <h3
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
);

export const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-slate-500", className)} {...props} />
);

export const CardContent = ({ className, ...props }) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
);

// Avatar Components
export const Avatar = ({ className, ...props }) => (
  <div
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
);

export const AvatarImage = ({ className, ...props }) => (
  <img className={cn("aspect-square h-full w-full", className)} {...props} />
);

export const AvatarFallback = ({ className, ...props }) => (
  <div
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-slate-100",
      className
    )}
    {...props}
  />
);

// Badge Component
export const Badge = ({ className, variant = "default", ...props }) => {
  const variants = {
    default:
      "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80",
    secondary:
      "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    destructive:
      "border-transparent bg-red-500 text-slate-50 hover:bg-red-500/80",
    outline: "text-slate-950",
    success: "border-transparent bg-emerald-100 text-emerald-800",
    warning: "border-transparent bg-yellow-100 text-yellow-800",
    info: "border-transparent bg-blue-100 text-blue-800",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

// Separator Component
export const Separator = ({
  className,
  orientation = "horizontal",
  ...props
}) => (
  <div
    className={cn(
      "shrink-0 bg-slate-200",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
  />
);
