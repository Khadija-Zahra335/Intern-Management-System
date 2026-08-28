export function FormLabel({
  children,
  required,
  className = "block text-sm font-medium text-foreground mb-1.5",
}: {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      {children}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );
}