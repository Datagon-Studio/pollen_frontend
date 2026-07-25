interface OtpUssdHintProps {
  ussdCode?: string | null;
}

export function OtpUssdHint({ ussdCode }: OtpUssdHintProps) {
  if (!ussdCode) return null;

  return (
    <p className="text-xs text-muted-foreground mt-2">
      Didn&apos;t receive the SMS? Dial{" "}
      <span className="font-mono font-medium text-foreground">{ussdCode}</span>{" "}
      on your phone to retrieve your code.
    </p>
  );
}
