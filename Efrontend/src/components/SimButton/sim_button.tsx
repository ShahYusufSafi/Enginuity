// sim_button.tsx
import React from 'react';
import styles from './SimButton.module.css';

interface SimButtonProps {
  
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void| Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
  children: React.ReactNode;
}

export default function SimButton({
  type = 'button', // default to "button" to avoid accidental form submits
  onClick,
  disabled = false,
  loading = false,
  children,
}: SimButtonProps) {
  return (

      <button
      type={type}
      className={styles.button}
      disabled={loading || disabled}
      onClick={onClick}
      >
      {loading ? 'Loading...' : children}
    </button>

  );
}
