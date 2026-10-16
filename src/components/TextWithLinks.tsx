export function TextWithLinks({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s<]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("https://") ? (
          <a
            key={`${part}-${i}`}
            href={part}
            target="_blank"
            rel="nofollow ugc noopener noreferrer"
            className="text-sky-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part.replace(/^https:\/\//, "")}
          </a>
        ) : (
          <span key={`${part}-${i}`}>{part}</span>
        ),
      )}
    </>
  );
}
