"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn, getInitials, avatarColor } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import NextImage from "next/image";

// ─── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const base = "btn-base";
    const variants = {
      primary: "accent-gradient text-white hover:opacity-90 active:scale-[.98] shadow-sm",
      ghost: "bg-transparent text-muted-foreground border border-border hover:text-foreground hover:bg-muted",
      danger: "bg-red-500/10 text-red-500 border border-red-500/25 hover:bg-red-500/20",
      outline: "bg-transparent border border-border text-foreground hover:bg-muted",
    };
    const sizes = {
      sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
      md: "h-10 px-4 text-sm rounded-xl",
      lg: "h-12 px-6 text-sm rounded-xl",
      icon: "h-9 w-9 rounded-xl p-0",
    };
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : children}
      </button>
    );
  }
);
Button.displayName = "Button";

// ─── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "input-base",
            icon && "pl-10",
            error && "border-red-500 focus:border-red-500",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

// ─── Select ──────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn("input-base cursor-pointer", className)}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
);
Select.displayName = "Select";

// ─── Switch ──────────────────────────────────────────────────────────────────
interface SwitchRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}

export function SwitchRow({ label, description, checked, onCheckedChange }: SwitchRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        )}
      </div>
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          "relative w-10 h-[22px] rounded-full transition-colors duration-200 outline-none cursor-pointer flex-shrink-0",
          checked ? "accent-gradient" : "bg-border"
        )}
      >
        <SwitchPrimitive.Thumb className="block w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
      </SwitchPrimitive.Root>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: "accent" | "green" | "red" | "amber" | "cyan" | "muted";
  className?: string;
}

export function Badge({ children, variant = "accent", className }: BadgeProps) {
  const variants = {
    accent: "bg-accent/10 text-accent border-accent/25",
    green: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/25",
    red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25",
    muted: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const sizes = {
    xs: "w-6 h-6 text-[9px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-20 h-20 text-2xl",
  };
  const px = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };

  if (src) {
    return (
      <NextImage
        src={src}
        alt={name}
        width={px[size]}
        height={px[size]}
        className={cn("rounded-full object-cover flex-shrink-0", sizes[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 bg-gradient-to-br",
        avatarColor(name),
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-2xl shadow-sm",
        hover && "card-hover cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Stat cell ────────────────────────────────────────────────────────────────
export function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-muted rounded-xl p-4 text-center border border-border">
      <div className="text-2xl font-black accent-gradient-text">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
