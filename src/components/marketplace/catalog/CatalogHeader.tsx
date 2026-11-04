import React from "react";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import StackHeader from "@/src/components/StackHeader";
import CartIconButton from "@/src/components/marketplace/CartIconButton";

type Props = {
  title: string;
  onBack: () => void;
};

/** Marketplace / Product Details header: the app's green stack header (same as Cart) with the cart icon. */
export default function CatalogHeader({ title, onBack }: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;

  return (
    <StackHeader
      title={title}
      onBack={onBack}
      rightIcon={<CartIconButton color={theme.white} />}
    />
  );
}
