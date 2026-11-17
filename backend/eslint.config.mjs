import tseslint from "typescript-eslint";
export default tseslint.config(
  { ignores: ["dist/**", "src/generated/**", "coverage/**"] },
  ...tseslint.configs.recommended,
  { files: ["**/*.ts"], rules: { "@typescript-eslint/consistent-type-imports": "error" } },
);
