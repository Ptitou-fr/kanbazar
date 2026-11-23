import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Pilotes et éléments propres au moteur de stockage : couche données uniquement.
const driverImports = {
  group: ["@libsql/*", "@tursodatabase/*"],
  message: "Seule la couche données (data/) accède au pilote de la base.",
};

// Frontières des couches (INTENT.md) : présentation → service → données.
const layerBoundaries = [
  {
    files: ["app/**", "components/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          driverImports,
          {
            group: ["@/data/*", "**/data/*"],
            message: "La présentation passe par les services (services/), jamais par data/.",
          },
        ],
      }],
    },
  },
  {
    files: ["services/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          driverImports,
          {
            group: ["@/app/*", "@/components/*", "**/app/*", "**/components/*"],
            message: "Les services ne dépendent pas de la présentation.",
          },
        ],
      }],
    },
  },
  {
    files: ["data/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: [
              "@/services/*", "@/app/*", "@/components/*",
              "**/services/*", "**/app/*", "**/components/*",
            ],
            message: "La couche données ne dépend ni des services ni de la présentation.",
          },
        ],
      }],
    },
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...layerBoundaries,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
