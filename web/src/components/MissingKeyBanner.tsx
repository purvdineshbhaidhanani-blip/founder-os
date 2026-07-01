import React from "react";

export default function MissingKeyBanner({
  message,
  missing,
}: {
  message: string;
  missing: string[];
}): React.ReactElement {
  return (
    <div className="banner banner-error">
      <p>{message}</p>
      {missing.length > 0 && (
        <ul>
          {missing.map((key) => (
            <li key={key}>
              <code>{key}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
