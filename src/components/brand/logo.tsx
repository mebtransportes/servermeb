import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const LOGO_SRC = "/mebtransportes.png";

type LogoProps = {
  variant?: "login" | "sidebar";
  linked?: boolean;
  homeHref?: string;
  className?: string;
};

export function Logo({
  variant = "sidebar",
  linked = false,
  homeHref = "/dashboard",
  className,
}: LogoProps) {
  const isLogin = variant === "login";

  const image = (
    <Image
      src={LOGO_SRC}
      alt="MEB Transporte"
      width={isLogin ? 360 : 320}
      height={isLogin ? 130 : 120}
      priority={isLogin}
      className={cn(
        "object-contain object-center",
        isLogin ? "h-32 w-auto max-w-[min(360px,100%)]" : "h-[7.5rem] w-full",
        className
      )}
    />
  );

  if (linked) {
    return (
      <Link
        href={homeHref}
        className="flex w-full items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg"
      >
        {image}
      </Link>
    );
  }

  return image;
}
