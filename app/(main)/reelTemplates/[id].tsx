import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

/** Configure flow lives on the templates list screen now — open it on this template. */
export default function ReelTemplateDetailRedirect() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  useEffect(() => {
    router.replace({
      pathname: "/(main)/reelTemplates" as any,
      params: id ? { templateId: id } : {},
    });
  }, [id, router]);

  return null;
}
