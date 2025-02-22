import { useEffect, useState } from "react";

export default function useAnnotations() {
  const [annotations, setAnnotations] = useState([]);

  useEffect(() => {
    chrome.storage.local.get("annotations", (data) => {
      if (data.annotations) {
        setAnnotations(data.annotations);
      }
    });
  }, []);

  return [annotations, setAnnotations];
}
