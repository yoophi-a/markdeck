import Image from 'next/image';

interface MarkdownImageProps {
  src: string;
  alt: string;
}

export function MarkdownImage({ src, alt }: MarkdownImageProps) {
  return (
    <span className="markdown-image-wrap">
      <Image src={src} alt={alt} width={1600} height={900} className="markdown-image" unoptimized />
    </span>
  );
}
