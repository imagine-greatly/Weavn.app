interface LabelProps {
  children: React.ReactNode
  className?: string
}

export default function Label({ children, className = '' }: LabelProps) {
  return (
    <span
      className={`inline-block border-l-2 border-cyan pl-3 font-mono text-xs uppercase tracking-widest text-cyan-muted ${className}`}
    >
      {children}
    </span>
  )
}
