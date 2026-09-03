export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? "",
  xifadoMasterCode: process.env.XIFADO_MASTER_CODE ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
