import Image from "next/image";
import Link from "next/link";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/images/logos/logo-new-black.png"   
        alt="Powerbook"
        width={130}
        height={35}
        priority
      />
    </Link>
  );
}
