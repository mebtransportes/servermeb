import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#33388d",
          borderRadius: 8,
          position: "relative",
        }}
      >
        {/* carreta */}
        <div
          style={{
            position: "absolute",
            left: 4,
            top: 10,
            width: 13,
            height: 9,
            background: "#ffffff",
            borderRadius: 2,
          }}
        />
        {/* cabine */}
        <div
          style={{
            position: "absolute",
            left: 17,
            top: 12,
            width: 10,
            height: 7,
            background: "#ffffff",
            borderRadius: 2,
          }}
        />
        {/* janela */}
        <div
          style={{
            position: "absolute",
            left: 19,
            top: 13,
            width: 4,
            height: 3,
            background: "#33388d",
            borderRadius: 1,
          }}
        />
        {/* roda 1 */}
        <div
          style={{
            position: "absolute",
            left: 7,
            bottom: 4,
            width: 5,
            height: 5,
            background: "#ffffff",
            borderRadius: 999,
          }}
        />
        {/* roda 2 */}
        <div
          style={{
            position: "absolute",
            right: 6,
            bottom: 4,
            width: 5,
            height: 5,
            background: "#ffffff",
            borderRadius: 999,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
