import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const LOGO_SRC = "/mebtransportes.png";

type LogoProps = {
  variant?: "login" | "sidebar" | "sidebarIcon" | "sidebarWatermark" | "dashboard";
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
  const isSidebarIcon = variant === "sidebarIcon";
  const isWatermark = variant === "sidebarWatermark";
  const isDashboard = variant === "dashboard";

  const image = (
    <Image
      src={LOGO_SRC}
      alt="M&B Transporte"
      width={
        isLogin ? 360 : isDashboard ? 1536 : isSidebarIcon ? 256 : isWatermark ? 200 : 320
      }
      height={
        isLogin ? 240 : isDashboard ? 1024 : isSidebarIcon ? 256 : isWatermark ? 72 : 120
      }
      priority={isLogin || isDashboard}
      quality={isDashboard ? 100 : undefined}
      unoptimized={isLogin || isDashboard || isSidebarIcon}
      sizes={isDashboard ? "(max-width: 1280px) 90vw, 640px" : undefined}
      className={cn(
        "object-contain object-center",
        isLogin
          ? "h-auto w-full max-w-[min(300px,85vw)]"
          : isDashboard
            ? "h-[21rem] w-auto max-w-full"
            : isSidebarIcon
              ? "h-10 w-10"
              : isWatermark
                ? "h-16 w-auto max-w-full opacity-80"
                : "h-[7.5rem] w-full",
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
