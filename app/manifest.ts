import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CurioSphere - College & CBSE Learning Platform",
    short_name: "CurioSphere",
    description: "College Coding Labs, CBSE NCERT Library, Live Classes, Doubt Wall & AI Mentor",
    start_url: "/",
    display: "standalone",
    background_color: "#090d16",
    theme_color: "#4f46e5",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/curiosphere-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
