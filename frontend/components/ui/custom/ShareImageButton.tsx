import { Share } from "lucide-react";
import React from "react";

interface Props {
  imageUrl: string;
}

const ShareImageButton: React.FC<Props> = ({ imageUrl }) => {
  const share = () => {
    const text = encodeURIComponent(imageUrl);

    window.open(
      `https://wa.me/?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <button
      type="button"
      aria-label="Share on WhatsApp"
      className="app-focus fixed left-4 top-4 z-[100] flex size-11 items-center justify-center rounded-full border border-app-line bg-app-card text-app-ink shadow-card transition-colors hover:bg-app-soft"
      onClick={share}
    >
      <Share className="size-5" aria-hidden="true" />
    </button>
  );
};

export default ShareImageButton;
