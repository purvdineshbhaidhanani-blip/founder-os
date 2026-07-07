import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  footer?: React.ReactNode;
}

export function Card({ title, footer, className, children, ...rest }: CardProps): React.JSX.Element {
  return (
    <div className={["fx-card", className].filter(Boolean).join(" ")} {...rest}>
      {title && <h3 className="fx-card__title">{title}</h3>}
      {children}
      {footer && <div className="fx-card__footer">{footer}</div>}
    </div>
  );
}
