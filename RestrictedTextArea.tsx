// components/RestrictedTextArea.tsx
import React from 'react';

interface RestrictedTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  restrictPaste?: boolean;
  warningMessage?: string;
}

export const RestrictedTextArea: React.FC<RestrictedTextAreaProps> = ({
  restrictPaste = true,
  warningMessage = 'Copy-paste is disabled. Please type your answer.',
  ...props
}) => {
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (restrictPaste) {
      e.preventDefault();
      alert(warningMessage);
    }
  };

  return <textarea onPaste={handlePaste} {...props} />;
};