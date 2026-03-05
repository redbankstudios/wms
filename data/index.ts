import { IDataProvider } from "@/data/providers/IDataProvider"
import { mockProvider } from "@/data/providers/mock"
import { supabaseProvider } from "@/data/providers/supabase"

export function getProvider(): IDataProvider {
  if (process.env.NEXT_PUBLIC_DATA_PROVIDER === "supabase") {
    return supabaseProvider
  }

  return mockProvider
}
