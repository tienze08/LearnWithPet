import { useEffect } from "react";
import { useAuthStore } from "./stores/auth.store";

export function useAuthHydration() {
  useEffect(() => {
    const token = localStorage.getItem("vocapet_token");
    const name = localStorage.getItem("vocapet_name");

    useAuthStore.setState({
      token,
      name,
    });
  }, []);
}