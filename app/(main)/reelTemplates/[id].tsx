import { useEffect } from "react";
import { useRouter } from "expo-router";

/** Configure flow lives on the templates list screen now. */
export default function ReelTemplateDetailRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(main)/reelTemplates" as any);
  }, [router]);

  return null;
}
