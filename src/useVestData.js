import { useState } from "react";
import { initialState } from "./data";

// Satu-satunya tempat data hidup. Komponen lain hanya menerima props.
export default function useVestData() {
  const [state, setState] = useState(initialState);

  // Contoh Supabase (hapus komentar bila dipakai):
  // useEffect(() => {
  //   supabase.from("detections").select("*")
  //     .order("created_at", { ascending: false }).limit(20)
  //     .then(({ data }) => data && setState((s) => ({ ...s, detections: data })));
  // }, []);

  return [state, setState];
}
