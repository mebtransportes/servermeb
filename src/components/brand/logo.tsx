import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/meblogo.png";

type LogoProps = {
  variant?: "login" | "sidebar";
  linked?: boolean;
  className?: string;
};

export function Logo({ variant = "sidebar", linked = false, className }: LogoProps) {
  const isLogin = variant === "login";

  const image = (
    <Image
      src={LOGO_SRC}
      alt="MEB Transporte"
      width={isLogin ? 280 : 256}
      height={isLogin ? 100 : 96}
      priority={isLogin}
      className={cn(
        "object-contain",
        isLogin ? "h-24 w-auto max-w-[280px]" : "h-20 w-full max-w-full",
        className
      )}
    />
  );

  if (linked) {
    return (
      <Link
        href="/dashboard"
        className="flex w-full items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg"
      >
        {image}
      </Link>
    );
  }

  return image;
}
